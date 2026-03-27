import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import {
  NeighborhoodDto,
  NeighborhoodsListResponseDto,
} from './dto/neighborhood.dto';
import { NeighborhoodsService } from './neighborhoods.service';

@Controller('neighborhoods')
@UseGuards(JwtAuthGuard)
export class NeighborhoodsController {
  constructor(private readonly neighborhoodsService: NeighborhoodsService) {}

  @Get()
  async findAll(): Promise<NeighborhoodsListResponseDto> {
    return this.neighborhoodsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<NeighborhoodDto | null> {
    return this.neighborhoodsService.findOne(id);
  }
}
