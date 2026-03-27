import { Module } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

import { NeighborhoodsController } from './neighborhoods.controller';
import { NeighborhoodsService } from './neighborhoods.service';

@Module({
  imports: [AuthModule],
  controllers: [NeighborhoodsController],
  providers: [NeighborhoodsService, PrismaService],
  exports: [NeighborhoodsService],
})
export class NeighborhoodsModule {}
