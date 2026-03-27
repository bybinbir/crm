import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';

import {
  CurrentUser,
  CurrentUserData,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CreateIntegrationConfigDto, UpdateIntegrationConfigDto } from './dto';
import { IntegrationsService } from './integrations.service';
import { ISSManagerService } from './issmanager/issmanager.service';

@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly issmanagerService: ISSManagerService
  ) {}

  /**
   * Create integration config (super admin only)
   */
  @Post()
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateIntegrationConfigDto,
    @Req() req: Request
  ) {
    return this.integrationsService.create(
      user.id,
      dto,
      req.ip,
      req.headers['user-agent']
    );
  }

  /**
   * Get all integration configs (admin+ can view)
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ANALYST)
  async findAll() {
    return this.integrationsService.findAll();
  }

  /**
   * Get single integration config
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ANALYST)
  async findOne(@Param('id') id: string) {
    return this.integrationsService.findOne(id);
  }

  /**
   * Update integration config (super admin only)
   */
  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationConfigDto,
    @Req() req: Request
  ) {
    return this.integrationsService.update(
      user.id,
      id,
      dto,
      req.ip,
      req.headers['user-agent']
    );
  }

  /**
   * Delete integration config (super admin only)
   */
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    await this.integrationsService.delete(
      user.id,
      id,
      req.ip,
      req.headers['user-agent']
    );
  }

  /**
   * Test ISSmanager connection
   */
  @Post('issmanager/:id/test')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async testConnection(@Param('id') id: string) {
    return this.issmanagerService.testConnection(id);
  }

  /**
   * Start sync now
   */
  @Post('issmanager/:id/sync')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async startSync(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string
  ) {
    const syncRunId = await this.issmanagerService.startSync(id, user.id);
    return { syncRunId };
  }

  /**
   * Get sync run status
   */
  @Get('issmanager/sync-runs/:syncRunId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ANALYST)
  async getSyncRunStatus(@Param('syncRunId') syncRunId: string) {
    return this.issmanagerService.getSyncRunStatus(syncRunId);
  }

  /**
   * Get recent sync runs for integration
   */
  @Get('issmanager/:id/sync-runs')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ANALYST)
  async getRecentSyncRuns(@Param('id') id: string) {
    return this.issmanagerService.getRecentSyncRuns(id);
  }

  /**
   * Get integration status (health check)
   */
  @Get('issmanager/:id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ANALYST)
  async getStatus(@Param('id') id: string) {
    const config = await this.integrationsService.findOne(id);
    const recentSyncs = await this.issmanagerService.getRecentSyncRuns(id, 5);

    return {
      config,
      recentSyncs,
      isHealthy: config.status === 'ACTIVE' && config.isEnabled,
    };
  }
}
