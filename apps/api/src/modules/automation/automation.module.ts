import { Module, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ImportsModule } from '../imports/imports.module';

import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { SchedulerService } from './scheduler.service';
import { ISSManagerAutomationWorker } from './workers/issmanager-automation.worker';

@Module({
  imports: [ImportsModule, AuthModule],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    ISSManagerAutomationWorker,
    SchedulerService,
    PrismaService,
  ],
  exports: [AutomationService],
})
export class AutomationModule implements OnModuleInit {
  constructor(private readonly schedulerService: SchedulerService) {}

  async onModuleInit() {
    // Start scheduler when module initializes
    await this.schedulerService.startAllSchedules();
  }
}
