import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { ISSManagerService } from './issmanager/issmanager.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    ISSManagerService,
    PrismaService,
    AuditService,
  ],
  exports: [IntegrationsService, ISSManagerService],
})
export class IntegrationsModule {}
