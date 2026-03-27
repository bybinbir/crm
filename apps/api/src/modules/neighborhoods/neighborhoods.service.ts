import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

import {
  NeighborhoodDto,
  NeighborhoodsListResponseDto,
} from './dto/neighborhood.dto';

@Injectable()
export class NeighborhoodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<NeighborhoodsListResponseDto> {
    const neighborhoods = await this.prisma.neighborhood.findMany({
      orderBy: [{ city: 'asc' }, { district: 'asc' }, { name: 'asc' }],
    });

    // Count customers per neighborhood from latest snapshots
    const customerCounts = await this.prisma.customerSnapshot.groupBy({
      by: ['neighborhoodId'],
      _count: {
        externalId: true,
      },
    });

    const countMap = new Map(
      customerCounts.map((c) => [c.neighborhoodId, c._count.externalId]),
    );

    const neighborhoodsWithCounts: NeighborhoodDto[] = neighborhoods.map(
      (n) => ({
        id: n.id,
        name: n.name,
        district: n.district,
        city: n.city,
        customerCount: n.id ? countMap.get(n.id) ?? 0 : 0,
      }),
    );

    return {
      neighborhoods: neighborhoodsWithCounts,
      total: neighborhoods.length,
    };
  }

  async findOne(id: string): Promise<NeighborhoodDto | null> {
    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id },
    });

    if (!neighborhood) return null;

    const customerCount = await this.prisma.customerSnapshot.count({
      where: { neighborhoodId: id },
    });

    return {
      id: neighborhood.id,
      name: neighborhood.name,
      district: neighborhood.district,
      city: neighborhood.city,
      customerCount,
    };
  }
}
