import { Injectable, Logger } from '@nestjs/common';
import {
  AutomationJobType,
  AutomationJobStatus,
  AutomationTriggerType,
} from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

import { ISSManagerAutomationWorker } from './workers/issmanager-automation.worker';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly issManagerWorker: ISSManagerAutomationWorker
  ) {}

  /**
   * Create or update schedule for an integration
   */
  async upsertSchedule(
    integrationConfigId: string,
    cronExpression: string,
    isEnabled: boolean = true
  ) {
    const schedule = await this.prisma.automationSchedule.upsert({
      where: {
        integrationConfigId_jobType: {
          integrationConfigId,
          jobType: AutomationJobType.ISSMANAGER_EXPORT_IMPORT,
        },
      },
      update: {
        cronExpression,
        isEnabled,
        updatedAt: new Date(),
      },
      create: {
        integrationConfigId,
        jobType: AutomationJobType.ISSMANAGER_EXPORT_IMPORT,
        cronExpression,
        isEnabled,
        timezone: 'Europe/Istanbul',
      },
    });

    this.logger.log(
      `Schedule ${isEnabled ? 'enabled' : 'disabled'} for integration ${integrationConfigId}: ${cronExpression}`
    );

    return schedule;
  }

  /**
   * Trigger manual run for an integration
   */
  async triggerManualRun(integrationConfigId: string) {
    this.logger.log(
      `Manual run triggered for integration: ${integrationConfigId}`
    );

    // Create job with MANUAL trigger
    const job = await this.prisma.automationJob.create({
      data: {
        jobType: AutomationJobType.ISSMANAGER_EXPORT_IMPORT,
        status: AutomationJobStatus.QUEUED,
        triggerType: AutomationTriggerType.MANUAL,
        scheduleId: null, // No schedule for manual runs
      },
    });

    // Execute immediately (async, non-blocking)
    process.nextTick(() => {
      this.executeJob(job.id, integrationConfigId).catch((error) => {
        this.logger.error(`Manual job ${job.id} execution failed:`, error);
      });
    });

    return job;
  }

  /**
   * Execute automation job
   */
  async executeJob(jobId: string, integrationConfigId: string) {
    this.logger.log(`Executing job: ${jobId}`);

    try {
      // Update job status to RUNNING
      await this.prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: AutomationJobStatus.RUNNING,
          startedAt: new Date(),
          lockedAt: new Date(),
          lockedBy: process.pid.toString(),
        },
      });

      // Get integration config
      const integration = await this.prisma.integrationConfig.findUnique({
        where: { id: integrationConfigId },
      });

      if (!integration) {
        throw new Error(`Integration config not found: ${integrationConfigId}`);
      }

      // Execute worker
      const result = await this.issManagerWorker.execute(integration, jobId);

      // Update job with success
      await this.prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: AutomationJobStatus.COMPLETED,
          completedAt: new Date(),
          filesProcessed: result.filesProcessed,
          recordsProcessed: result.recordsProcessed,
          recordsSucceeded: result.recordsSucceeded,
          recordsFailed: result.recordsFailed,
          downloadedFile: result.downloadedFile,
          stagingFilePath: result.stagingFilePath,
          importBatchId: result.importBatchId,
        },
      });

      this.logger.log(`Job ${jobId} completed successfully`);
    } catch (error) {
      this.logger.error(`Job ${jobId} failed:`, error);

      await this.prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: AutomationJobStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
          errorDetails: {
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          },
        },
      });

      throw error;
    }
  }

  /**
   * Get job history for an integration
   */
  async getJobHistory(integrationConfigId: string, limit: number = 20) {
    // Find schedule
    const schedule = await this.prisma.automationSchedule.findFirst({
      where: {
        integrationConfigId,
        jobType: AutomationJobType.ISSMANAGER_EXPORT_IMPORT,
      },
    });

    if (!schedule) {
      return [];
    }

    // Get jobs
    return this.prisma.automationJob.findMany({
      where: {
        scheduleId: schedule.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get schedule status for an integration
   */
  async getScheduleStatus(integrationConfigId: string) {
    const schedule = await this.prisma.automationSchedule.findFirst({
      where: {
        integrationConfigId,
        jobType: AutomationJobType.ISSMANAGER_EXPORT_IMPORT,
      },
      include: {
        jobs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    return schedule;
  }
}
