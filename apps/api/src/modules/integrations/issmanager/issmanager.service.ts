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
   * This is a skeleton - will be expanded in future phases
   */
  async startSync(configId: string, _userId: string): Promise<string> {
    // Create sync run record
    const syncRun = await this.prisma.integrationSyncRun.create({
      data: {
        integrationConfigId: configId,
        status: SyncStatus.PENDING,
        startedAt: new Date(),
      },
    });

    // Update integration config
    await this.prisma.integrationConfig.update({
      where: { id: configId },
      data: {
        lastSyncAt: new Date(),
      },
    });

    // In future: trigger async job to actually sync data
    // For now, just mark as completed immediately
    await this.prisma.integrationSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
      },
    });

    return syncRun.id;
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
