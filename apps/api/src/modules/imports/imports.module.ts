import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
