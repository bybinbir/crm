import { Module } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ISSManagerService } from './issmanager/issmanager.service';

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
