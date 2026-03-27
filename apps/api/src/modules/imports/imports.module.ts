import { Module } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportProcessorService } from './services/import-processor.service';

@Module({
  imports: [AuthModule],
  providers: [ImportsService, ImportProcessorService, PrismaService],
  controllers: [ImportsController],
  exports: [ImportsService],
})
export class ImportsModule {}
