/**
 * Integrations Service
 * Manages integration configurations (create, update, delete, list)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  encrypt,
  decrypt,
  maskSecret,
} from '../../common/utils/encryption.util';
import {
  CreateIntegrationConfigDto,
  UpdateIntegrationConfigDto,
} from './dto';
import {
  IntegrationProvider,
  IntegrationStatus,
  AuditAction,
} from '@prisma/client';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create new integration configuration
   */
  async create(
    userId: string,
    dto: CreateIntegrationConfigDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Encrypt API key
    const apiKeyEncrypted = encrypt(dto.apiKey);

    const config = await this.prisma.integrationConfig.create({
      data: {
        provider: IntegrationProvider.ISSMANAGER,
        name: dto.name,
        baseUrl: dto.baseUrl,
        apiKeyEncrypted,
        timeoutMs: dto.timeoutMs || 30000,
        isEnabled: true,
        status: IntegrationStatus.PENDING,
        createdById: userId,
        updatedById: userId,
      },
    });

    // Log audit
    await this.auditService.log({
      userId,
      action: AuditAction.INTEGRATION_CREATED,
      entityType: 'IntegrationConfig',
      entityId: config.id,
      metadata: {
        provider: config.provider,
        name: config.name,
        baseUrl: config.baseUrl,
      },
      ipAddress,
      userAgent,
    });

    return this.formatConfigForResponse(config);
  }

  /**
   * Update integration configuration
   */
  async update(
    userId: string,
    configId: string,
    dto: UpdateIntegrationConfigDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { id: configId },
    });

    if (!existing) {
      throw new NotFoundException('Integration config not found');
    }

    // Prepare update data
    const updateData: {
      name?: string;
      baseUrl?: string;
      apiKeyEncrypted?: string;
      timeoutMs?: number;
      isEnabled?: boolean;
      updatedById: string;
    } = {
      updatedById: userId,
    };

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.baseUrl !== undefined) {
      updateData.baseUrl = dto.baseUrl;
    }

    if (dto.apiKey !== undefined) {
      updateData.apiKeyEncrypted = encrypt(dto.apiKey);
    }

    if (dto.timeoutMs !== undefined) {
      updateData.timeoutMs = dto.timeoutMs;
    }

    if (dto.isEnabled !== undefined) {
      updateData.isEnabled = dto.isEnabled;
    }

    const config = await this.prisma.integrationConfig.update({
      where: { id: configId },
      data: updateData,
    });

    // Log audit
    await this.auditService.log({
      userId,
      action: AuditAction.INTEGRATION_UPDATED,
      entityType: 'IntegrationConfig',
      entityId: config.id,
      metadata: {
        changes: Object.keys(dto),
      },
      ipAddress,
      userAgent,
    });

    return this.formatConfigForResponse(config);
  }

  /**
   * Get all integration configurations
   */
  async findAll() {
    const configs = await this.prisma.integrationConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return configs.map((config) => this.formatConfigForResponse(config));
  }

  /**
   * Get single integration configuration
   */
  async findOne(configId: string) {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException('Integration config not found');
    }

    return this.formatConfigForResponse(config);
  }

  /**
   * Delete integration configuration
   */
  async delete(
    userId: string,
    configId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { id: configId },
    });

    if (!existing) {
      throw new NotFoundException('Integration config not found');
    }

    await this.prisma.integrationConfig.delete({
      where: { id: configId },
    });

    // Log audit
    await this.auditService.log({
      userId,
      action: AuditAction.INTEGRATION_DELETED,
      entityType: 'IntegrationConfig',
      entityId: configId,
      metadata: {
        provider: existing.provider,
        name: existing.name,
      },
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  /**
   * Format config for API response
   * NEVER return plaintext API key
   */
  private formatConfigForResponse(config: {
    id: string;
    provider: IntegrationProvider;
    name: string;
    baseUrl: string;
    apiKeyEncrypted: string;
    timeoutMs: number;
    isEnabled: boolean;
    status: IntegrationStatus;
    lastTestAt: Date | null;
    lastTestStatus: string | null;
    lastTestMessage: string | null;
    lastSyncAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
    updatedById: string | null;
  }) {
    // Decrypt and mask API key for display
    let maskedApiKey = '""""""""';
    try {
      const decrypted = decrypt(config.apiKeyEncrypted);
      maskedApiKey = maskSecret(decrypted, 4);
    } catch {
      // If decryption fails, keep masked
    }

    return {
      id: config.id,
      provider: config.provider,
      name: config.name,
      baseUrl: config.baseUrl,
      apiKeyMasked: maskedApiKey, // NEVER return actual key
      timeoutMs: config.timeoutMs,
      isEnabled: config.isEnabled,
      status: config.status,
      lastTestAt: config.lastTestAt,
      lastTestStatus: config.lastTestStatus,
      lastTestMessage: config.lastTestMessage,
      lastSyncAt: config.lastSyncAt,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
