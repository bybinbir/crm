import { Module } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

import { NeighborhoodsController } from './neighborhoods.controller';
import { NeighborhoodsService } from './neighborhoods.service';

@Module({
  controllers: [NeighborhoodsController],
  providers: [NeighborhoodsService, PrismaService],
  exports: [NeighborhoodsService],
})
export class NeighborhoodsModule {}
