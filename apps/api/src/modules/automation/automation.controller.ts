import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutomationService } from './automation.service';

@Controller('api/v1/automation')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  /**
   * Trigger manual export-import run for an integration
   * POST /api/v1/automation/integrations/:integrationId/trigger
   */
  @Post('integrations/:integrationId/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerManualRun(@Param('integrationId') integrationId: string) {
    const job = await this.automationService.triggerManualRun(integrationId);

    return {
      success: true,
      message: 'Otomatik çekim başlatıldı',
      job: {
        id: job.id,
        status: job.status,
        triggerType: job.triggerType,
        createdAt: job.createdAt,
      },
    };
  }

  /**
   * Get or create schedule for an integration
   * GET /api/v1/automation/integrations/:integrationId/schedule
   */
  @Get('integrations/:integrationId/schedule')
  async getSchedule(@Param('integrationId') integrationId: string) {
    const schedule =
      await this.automationService.getScheduleStatus(integrationId);

    return {
      success: true,
      schedule,
    };
  }

  /**
   * Update schedule for an integration
   * PATCH /api/v1/automation/integrations/:integrationId/schedule
   */
  @Patch('integrations/:integrationId/schedule')
  async updateSchedule(
    @Param('integrationId') integrationId: string,
    @Body()
    body: {
      cronExpression?: string;
      isEnabled?: boolean;
    }
  ) {
    // Get current schedule first
    const currentSchedule =
      await this.automationService.getScheduleStatus(integrationId);

    const cronExpression =
      body.cronExpression || currentSchedule?.cronExpression || '0 18 * * *';
    const isEnabled =
      body.isEnabled !== undefined
        ? body.isEnabled
        : (currentSchedule?.isEnabled ?? true);

    const schedule = await this.automationService.upsertSchedule(
      integrationId,
      cronExpression,
      isEnabled
    );

    return {
      success: true,
      message: 'Otomatik çekim zamanlaması güncellendi',
      schedule,
    };
  }

  /**
   * Get job history for an integration
   * GET /api/v1/automation/integrations/:integrationId/jobs
   */
  @Get('integrations/:integrationId/jobs')
  async getJobHistory(
    @Param('integrationId') integrationId: string,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const jobs = await this.automationService.getJobHistory(
      integrationId,
      limitNum
    );

    return {
      success: true,
      jobs,
      count: jobs.length,
    };
  }
}
