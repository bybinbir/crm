import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

import { DashboardMetricsDto } from './dto/dashboard.dto';
import { ReportsSummaryDto } from './dto/reports.dto';

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
    const importSuccessRate =
      totalRows > 0 ? (successRows / totalRows) * 100 : 100;

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

  async getReportsSummary(): Promise<ReportsSummaryDto> {
    // Get all import batches
    const allBatches = await this.prisma.importBatch.findMany({
      select: {
        id: true,
        sourceType: true,
        fileName: true,
        totalRows: true,
        successRows: true,
        failedRows: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate source distribution
    const sourceDistMap = new Map<string, number>();
    allBatches.forEach((batch) => {
      const count = sourceDistMap.get(batch.sourceType) || 0;
      sourceDistMap.set(batch.sourceType, count + 1);
    });

    const totalBatches = allBatches.length;
    const sourceDistribution = Array.from(sourceDistMap.entries()).map(
      ([sourceType, count]) => ({
        sourceType,
        count,
        percentage: Math.round((count / totalBatches) * 100 * 10) / 10,
      })
    );

    // Calculate totals
    const totalImportedRows = allBatches.reduce(
      (sum, b) => sum + b.successRows,
      0
    );
    const totalFailedRows = allBatches.reduce(
      (sum, b) => sum + b.failedRows,
      0
    );
    const totalRows = totalImportedRows + totalFailedRows;
    const overallSuccessRate =
      totalRows > 0
        ? Math.round((totalImportedRows / totalRows) * 100 * 10) / 10
        : 100;

    // Get recent imports (last 10)
    const recentImports = allBatches.slice(0, 10).map((batch) => ({
      batchId: batch.id,
      sourceType: batch.sourceType,
      fileName: batch.fileName ?? 'Unknown',
      totalRows: batch.totalRows,
      successRows: batch.successRows,
      failedRows: batch.failedRows,
      status: batch.status,
      importedAt: batch.createdAt,
    }));

    // Get data quality metrics
    const uniqueCustomers = await this.prisma.customerSnapshot.groupBy({
      by: ['externalId'],
      _count: true,
    });

    const totalCustomers = uniqueCustomers.length;

    const customersWithNeighborhood = await this.prisma.customerSnapshot.count({
      where: {
        neighborhoodId: { not: null },
      },
    });

    const neighborhoodCoverageRate =
      totalCustomers > 0
        ? Math.round((customersWithNeighborhood / totalCustomers) * 100 * 10) /
          10
        : 0;

    // Get top neighborhoods by customer count
    const topNeighborhoodsData = await this.prisma.customerSnapshot.groupBy({
      by: ['neighborhoodId'],
      _count: true,
      where: {
        neighborhoodId: { not: null },
      },
      orderBy: {
        _count: {
          neighborhoodId: 'desc',
        },
      },
      take: 5,
    });

    const topNeighborhoods = await Promise.all(
      topNeighborhoodsData.map(async (item) => {
        const neighborhood = await this.prisma.neighborhood.findUnique({
          where: { id: item.neighborhoodId! },
          select: {
            id: true,
            name: true,
            district: true,
            city: true,
          },
        });

        return {
          id: neighborhood?.id ?? '',
          name: neighborhood?.name ?? 'Unknown',
          district: neighborhood?.district ?? 'Unknown',
          city: neighborhood?.city ?? 'Unknown',
          customerCount: item._count,
        };
      })
    );

    const totalNeighborhoods = await this.prisma.neighborhood.count();

    return {
      importSummary: {
        totalBatches,
        totalImportedRows,
        totalFailedRows,
        overallSuccessRate,
        sourceDistribution,
        recentImports,
      },
      dataQuality: {
        totalCustomers,
        totalNeighborhoods,
        customersWithNeighborhood,
        neighborhoodCoverageRate,
        topNeighborhoods,
      },
      generatedAt: new Date(),
    };
  }
}
