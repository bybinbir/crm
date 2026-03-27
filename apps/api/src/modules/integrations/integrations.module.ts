import { Module } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ISSManagerService } from './issmanager/issmanager.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ISSManagerService, PrismaService],
  exports: [IntegrationsService, ISSManagerService],
})
export class IntegrationsModule {}
