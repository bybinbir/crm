import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

import { CustomerDto, CustomersListResponseDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, pageSize = 50): Promise<CustomersListResponseDto> {
    const skip = (page - 1) * pageSize;

    // Get latest snapshot per customer (by externalId)
    const snapshots = await this.prisma.customerSnapshot.findMany({
      take: pageSize,
      skip,
      orderBy: [{ externalId: 'asc' }, { snapshotAt: 'desc' }],
      include: {
        neighborhood: true,
      },
      distinct: ['externalId'],
    });

    const total = await this.prisma.customerSnapshot.groupBy({
      by: ['externalId'],
      _count: true,
    });

    const customers: CustomerDto[] = snapshots.map((snapshot) => ({
      id: snapshot.id,
      externalId: snapshot.externalId,
      name: snapshot.name ?? 'Unknown',
      email: snapshot.email ?? undefined,
      phone: snapshot.phone ?? undefined,
      neighborhoodId: snapshot.neighborhoodId ?? undefined,
      neighborhoodName: snapshot.neighborhood?.name ?? undefined,
      district: snapshot.neighborhood?.district ?? undefined,
      city: snapshot.neighborhood?.city ?? undefined,
      sourceType: snapshot.sourceType ?? 'UNKNOWN',
      snapshotAt: snapshot.snapshotAt,
    }));

    return {
      customers,
      total: total.length,
      page,
      pageSize,
    };
  }

  async findOne(externalId: string): Promise<CustomerDto | null> {
    const snapshot = await this.prisma.customerSnapshot.findFirst({
      where: { externalId },
      orderBy: { snapshotAt: 'desc' },
      include: {
        neighborhood: true,
      },
    });

    if (!snapshot) return null;

    return {
      id: snapshot.id,
      externalId: snapshot.externalId,
      name: snapshot.name ?? 'Unknown',
      email: snapshot.email ?? undefined,
      phone: snapshot.phone ?? undefined,
      neighborhoodId: snapshot.neighborhoodId ?? undefined,
      neighborhoodName: snapshot.neighborhood?.name ?? undefined,
      district: snapshot.neighborhood?.district ?? undefined,
      city: snapshot.neighborhood?.city ?? undefined,
      sourceType: snapshot.sourceType ?? 'UNKNOWN',
      snapshotAt: snapshot.snapshotAt,
    };
  }
}
