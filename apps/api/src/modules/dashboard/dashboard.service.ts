import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

import { DashboardMetricsDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<DashboardMetricsDto> {
    // Count unique customers by externalId
    const uniqueCustomers = await this.prisma.customerSnapshot.groupBy({
      by: ['externalId'],
      _count: true,
    });

    // Count total neighborhoods
    const totalNeighborhoods = await this.prisma.neighborhood.count();

    // Get latest import batch
    const latestBatch = await this.prisma.importBatch.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // Calculate overall import success rate
    const allBatches = await this.prisma.importBatch.findMany({
      select: {
        totalRows: true,
        successRows: true,
        failedRows: true,
      },
    });

    const totalRows = allBatches.reduce((sum, b) => sum + b.totalRows, 0);
    const successRows = allBatches.reduce((sum, b) => sum + b.successRows, 0);
    const importSuccessRate = totalRows > 0 ? (successRows / totalRows) * 100 : 100;

    return {
      totalCustomers: uniqueCustomers.length,
      totalNeighborhoods,
      latestImport: latestBatch
        ? {
            batchId: latestBatch.id,
            fileName: latestBatch.fileName ?? 'Unknown',
            importedRows: latestBatch.successRows,
            failedRows: latestBatch.failedRows,
            status: latestBatch.status,
            importedAt: latestBatch.createdAt,
          }
        : undefined,
      importSuccessRate: Math.round(importSuccessRate * 10) / 10,
      dataSourceStatus: {
        type: 'CSV_UPLOAD',
        description: 'Imported snapshots from CSV upload',
        lastSync: latestBatch?.createdAt ?? null,
      },
    };
  }
}
