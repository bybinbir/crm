/**
 * ISSmanager Service
 * Manages ISSmanager integration lifecycle and data sync
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationStatus,
  SyncStatus,
} from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { decrypt } from '../../../common/utils/encryption.util';

import { ISSManagerClient } from './issmanager.client';
import { ISSManagerConnectionTestResult } from './issmanager.types';

@Injectable()
export class ISSManagerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get ISSmanager client instance from config
   */
  private async getClient(configId: string): Promise<ISSManagerClient> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new BadRequestException('Integration config not found');
    }

    if (config.provider !== IntegrationProvider.ISSMANAGER) {
      throw new BadRequestException('Invalid integration provider');
    }

    if (!config.isEnabled) {
      throw new BadRequestException('Integration is disabled');
    }

    // Decrypt API key
    const apiKey = decrypt(config.apiKeyEncrypted);

    return new ISSManagerClient({
      baseUrl: config.baseUrl,
      apiKey,
      timeoutMs: config.timeoutMs,
    });
  }

  /**
   * Test connection to ISSmanager
   */
  async testConnection(
    configId: string
  ): Promise<ISSManagerConnectionTestResult> {
    const client = await this.getClient(configId);
    const result = await client.testConnection();

    // Update integration config with test results
    await this.prisma.integrationConfig.update({
      where: { id: configId },
      data: {
        lastTestAt: new Date(),
        lastTestStatus: result.success ? 'success' : 'failed',
        lastTestMessage: result.message,
        status: result.success
          ? IntegrationStatus.ACTIVE
          : IntegrationStatus.ERROR,
      },
    });

    return result;
  }

  /**
   * Start a sync run
   * Fetches customers from ISSmanager API and imports them
   */
  async startSync(configId: string, userId: string): Promise<string> {
    // Check if sync already running for this config
    const runningSyncs = await this.prisma.integrationSyncRun.findFirst({
      where: {
        integrationConfigId: configId,
        status: {
          in: [SyncStatus.PENDING, SyncStatus.RUNNING],
        },
      },
    });

    if (runningSyncs) {
      throw new BadRequestException(
        'A sync is already running for this integration'
      );
    }

    // Create sync run record
    const syncRun = await this.prisma.integrationSyncRun.create({
      data: {
        integrationConfigId: configId,
        status: SyncStatus.PENDING,
        startedAt: new Date(),
      },
    });

    // Execute sync in background (fire and forget)

    this.executeSyncRun(syncRun.id, configId, userId);

    return syncRun.id;
  }

  /**
   * Execute sync run (background job)
   */
  private async executeSyncRun(
    syncRunId: string,
    configId: string,
    _userId: string
  ): Promise<void> {
    try {
      // Mark as running
      await this.prisma.integrationSyncRun.update({
        where: { id: syncRunId },
        data: { status: SyncStatus.RUNNING },
      });

      // Get client
      const client = await this.getClient(configId);

      // Fetch customers (paginated if needed)
      let recordsProcessed = 0;
      let recordsSucceeded = 0;
      let recordsFailed = 0;

      // Try to fetch customers
      try {
        const customersData = (await client.getCustomers()) as {
          customers?: Array<{
            id: string;
            name: string;
            email?: string;
            phone?: string;
            address?: string;
            [key: string]: unknown;
          }>;
        };

        const customers = customersData.customers || [];

        // Import each customer
        for (const customer of customers) {
          recordsProcessed++;

          try {
            // Parse address to extract neighborhood
            const neighborhood = this.parseNeighborhoodFromAddress(
              customer.address || ''
            );

            // Upsert customer snapshot
            // Note: Schema uses externalId+snapshotAt as unique, but we want latest snapshot per customer
            // So we find existing and update, or create new
            const existing = await this.prisma.customerSnapshot.findFirst({
              where: {
                externalId: customer.id,
                sourceType: 'ISSMANAGER_API',
              },
              orderBy: { snapshotAt: 'desc' },
            });

            if (existing) {
              await this.prisma.customerSnapshot.update({
                where: { id: existing.id },
                data: {
                  name: customer.name,
                  email: customer.email || null,
                  phone: customer.phone || null,
                  address: customer.address || null,
                  neighborhoodId: neighborhood?.id || null,
                  sourceData: JSON.parse(JSON.stringify(customer)) as never,
                  snapshotAt: new Date(),
                },
              });
            } else {
              await this.prisma.customerSnapshot.create({
                data: {
                  externalId: customer.id,
                  sourceType: 'ISSMANAGER_API',
                  name: customer.name,
                  email: customer.email || null,
                  phone: customer.phone || null,
                  address: customer.address || null,
                  neighborhoodId: neighborhood?.id || null,
                  sourceData: JSON.parse(JSON.stringify(customer)) as never,
                  snapshotAt: new Date(),
                },
              });
            }

            recordsSucceeded++;
          } catch (error) {
            recordsFailed++;
            // Log error but continue
            console.error(`Failed to import customer ${customer.id}:`, error);
          }
        }

        // Mark as completed
        await this.prisma.integrationSyncRun.update({
          where: { id: syncRunId },
          data: {
            status: SyncStatus.COMPLETED,
            completedAt: new Date(),
            recordsProcessed,
            recordsSucceeded,
            recordsFailed,
          },
        });

        // Update integration config
        await this.prisma.integrationConfig.update({
          where: { id: configId },
          data: {
            lastSyncAt: new Date(),
            status: IntegrationStatus.ACTIVE,
          },
        });
      } catch (error) {
        // Sync failed
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        await this.prisma.integrationSyncRun.update({
          where: { id: syncRunId },
          data: {
            status: SyncStatus.FAILED,
            completedAt: new Date(),
            recordsProcessed,
            recordsSucceeded,
            recordsFailed,
            errorMessage,
          },
        });

        await this.prisma.integrationConfig.update({
          where: { id: configId },
          data: {
            status: IntegrationStatus.ERROR,
          },
        });
      }
    } catch (error) {
      // Critical error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.integrationSyncRun.update({
        where: { id: syncRunId },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          errorMessage,
        },
      });
    }
  }

  /**
   * Parse neighborhood from address string
   * Simple parser - can be enhanced
   */
  private parseNeighborhoodFromAddress(address: string): {
    id: string;
    name: string;
  } | null {
    if (!address) {
      return null;
    }

    // Try to extract neighborhood (mahalle)
    const mahalleMatch = address.match(/([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\s*Mah/i);
    if (!mahalleMatch) {
      return null;
    }

    const neighborhoodName = mahalleMatch[1];

    // Try to extract district and city (for future use)
    // const parts = address.split('/');
    // const district = parts.length > 1 ? parts[0].trim() : 'Unknown';
    // const city = parts.length > 2 ? parts[1].trim() : 'Antalya';

    // For now, return a mock ID
    // In real implementation, this should look up or create neighborhood in database
    return {
      id: `neighborhood-${neighborhoodName.toLowerCase()}`,
      name: neighborhoodName,
    };
  }

  /**
   * Get sync run status
   */
  async getSyncRunStatus(syncRunId: string) {
    return this.prisma.integrationSyncRun.findUnique({
      where: { id: syncRunId },
      include: {
        integrationConfig: {
          select: {
            id: true,
            name: true,
            provider: true,
          },
        },
      },
    });
  }

  /**
   * Get recent sync runs for a config
   */
  async getRecentSyncRuns(configId: string, limit = 10) {
    return this.prisma.integrationSyncRun.findMany({
      where: { integrationConfigId: configId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
