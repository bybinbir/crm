import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationService } from './automation.service';
import { AutomationJobType } from '@prisma/client';

interface ScheduledTask {
  task: cron.ScheduledTask;
  integrationConfigId: string;
  cronExpression: string;
}

@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly scheduledTasks = new Map<string, ScheduledTask>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationService: AutomationService
  ) {}

  /**
   * Start all active schedules from database
   */
  async startAllSchedules() {
    this.logger.log('Starting automation scheduler...');

    try {
      const activeSchedules = await this.prisma.automationSchedule.findMany({
        where: {
          isEnabled: true,
          jobType: AutomationJobType.ISSMANAGER_EXPORT_IMPORT,
        },
        include: {
          integrationConfig: true,
        },
      });

      this.logger.log(`Found ${activeSchedules.length} active schedule(s)`);

      for (const schedule of activeSchedules) {
        this.scheduleJob(
          schedule.id,
          schedule.integrationConfigId,
          schedule.cronExpression
        );
      }

      this.logger.log('Automation scheduler started successfully');
    } catch (error) {
      this.logger.error('Failed to start scheduler:', error);
    }
  }

  /**
   * Schedule a single job
   */
  scheduleJob(
    scheduleId: string,
    integrationConfigId: string,
    cronExpression: string
  ) {
    // Stop existing task if any
    this.stopJob(scheduleId);

    this.logger.log(
      `Scheduling job for integration ${integrationConfigId}: ${cronExpression}`
    );

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      this.logger.error(`Invalid cron expression: ${cronExpression}`);
      return;
    }

    // Create scheduled task
    const task = cron.schedule(
      cronExpression,
      async () => {
        this.logger.log(
          `Executing scheduled job for integration: ${integrationConfigId}`
        );

        try {
          // Create job record
          const job = await this.prisma.automationJob.create({
            data: {
              scheduleId,
              jobType: AutomationJobType.ISSMANAGER_EXPORT_IMPORT,
              status: 'QUEUED',
              triggerType: 'SCHEDULED',
            },
          });

          // Update schedule last run time
          await this.prisma.automationSchedule.update({
            where: { id: scheduleId },
            data: {
              lastRunAt: new Date(),
            },
          });

          // Execute job
          await this.automationService.executeJob(job.id, integrationConfigId);

          // Update schedule with success status
          await this.prisma.automationSchedule.update({
            where: { id: scheduleId },
            data: {
              lastRunStatus: 'COMPLETED',
            },
          });
        } catch (error) {
          this.logger.error(
            `Scheduled job failed for integration ${integrationConfigId}:`,
            error
          );

          // Update schedule with failure status
          await this.prisma.automationSchedule.update({
            where: { id: scheduleId },
            data: {
              lastRunStatus: 'FAILED',
            },
          });
        }
      },
      {
        timezone: 'Europe/Istanbul',
      }
    );

    task.start();

    // Store task reference
    this.scheduledTasks.set(scheduleId, {
      task,
      integrationConfigId,
      cronExpression,
    });

    this.logger.log(`Job scheduled successfully: ${scheduleId}`);
  }

  /**
   * Stop a scheduled job
   */
  stopJob(scheduleId: string) {
    const scheduled = this.scheduledTasks.get(scheduleId);
    if (scheduled) {
      scheduled.task.stop();
      this.scheduledTasks.delete(scheduleId);
      this.logger.log(`Stopped scheduled job: ${scheduleId}`);
    }
  }

  /**
   * Reschedule a job (update cron expression)
   */
  async rescheduleJob(
    scheduleId: string,
    integrationConfigId: string,
    cronExpression: string
  ) {
    this.logger.log(
      `Rescheduling job ${scheduleId} with expression: ${cronExpression}`
    );
    this.scheduleJob(scheduleId, integrationConfigId, cronExpression);
  }

  /**
   * Stop all scheduled jobs on module destroy
   */
  onModuleDestroy() {
    this.logger.log('Stopping all scheduled jobs...');
    for (const [scheduleId, scheduled] of this.scheduledTasks) {
      scheduled.task.stop();
      this.logger.log(`Stopped job: ${scheduleId}`);
    }
    this.scheduledTasks.clear();
    this.logger.log('All scheduled jobs stopped');
  }

  /**
   * Get active schedules count
   */
  getActiveSchedulesCount(): number {
    return this.scheduledTasks.size;
  }

  /**
   * Get all active schedule IDs
   */
  getActiveScheduleIds(): string[] {
    return Array.from(this.scheduledTasks.keys());
  }
}
