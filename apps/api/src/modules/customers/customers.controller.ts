import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CustomersService } from './customers.service';
import { CustomerDto, CustomersListResponseDto } from './dto/customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<CustomersListResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;
    return this.customersService.findAll(pageNum, pageSizeNum);
  }

  @Get(':externalId')
  async findOne(
    @Param('externalId') externalId: string,
  ): Promise<CustomerDto | null> {
    return this.customersService.findOne(externalId);
  }
}
