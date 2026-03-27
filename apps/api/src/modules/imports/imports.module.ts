import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportProcessorService } from './services/import-processor.service';
import { PrismaService } from '@/common/prisma/prisma.service';

@Module({
  providers: [ImportsService, ImportProcessorService, PrismaService],
  controllers: [ImportsController],

  exports: [ImportsService],
})
export class ImportsModule {}
