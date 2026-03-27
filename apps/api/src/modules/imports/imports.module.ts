import { Module } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportProcessorService } from './services/import-processor.service';

@Module({
  providers: [ImportsService, ImportProcessorService, PrismaService],
  controllers: [ImportsController],

  exports: [ImportsService],
})
export class ImportsModule {}
