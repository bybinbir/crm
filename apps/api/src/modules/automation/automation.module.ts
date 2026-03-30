import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportsModule } from '../imports/imports.module';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { ISSManagerAutomationWorker } from './workers/issmanager-automation.worker';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ImportsModule],
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
