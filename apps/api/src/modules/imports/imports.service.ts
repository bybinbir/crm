import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  ImportBatch,
  ImportJob,
  ImportError,
  ImportStatus,
  ImportEntityType,
  ImportSourceType,
} from '@prisma/client';
import type { CreateImportBatchDto } from './dto/import.dto';

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(
    dto: CreateImportBatchDto,
    createdByUserId: string
  ): Promise<ImportBatch> {
    return this.prisma.importBatch.create({
      data: {
        sourceType: dto.sourceType,
        entityType: dto.entityType,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        fileMimeType: dto.fileMimeType,
        createdByUserId,
      },
    });
  }

  async getBatchById(id: string): Promise<ImportBatch | null> {
    return this.prisma.importBatch.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async listBatches(filters?: {
    status?: ImportStatus;
    entityType?: ImportEntityType;
    sourceType?: ImportSourceType;
    limit?: number;
    offset?: number;
  }): Promise<{ batches: ImportBatch[]; total: number }> {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.sourceType) where.sourceType = filters.sourceType;

    const [batches, total] = await Promise.all([
      this.prisma.importBatch.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.importBatch.count({ where }),
    ]);

    return { batches, total };
  }

  async updateBatchStatus(
    id: string,
    status: ImportStatus,
    errorMessage?: string
  ): Promise<ImportBatch> {
    return this.prisma.importBatch.update({
      where: { id },
      data: {
        status,
        errorMessage,
        startedAt: status === 'PROCESSING' ? new Date() : undefined,
        completedAt: ['COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED'].includes(
          status
        )
          ? new Date()
          : undefined,
      },
    });
  }

  async updateBatchStats(
    id: string,
    stats: {
      totalRows?: number;
      successRows?: number;
      failedRows?: number;
      skippedRows?: number;
    }
  ): Promise<ImportBatch> {
    return this.prisma.importBatch.update({
      where: { id },
      data: stats,
    });
  }

  async createJobs(
    batchId: string,
    rows: { rowNumber: number; rawData: Record<string, unknown> }[]
  ): Promise<void> {
    await this.prisma.importJob.createMany({
      data: rows.map((row) => ({
        batchId,
        rowNumber: row.rowNumber,
        rawData: row.rawData as any,
        status: 'PENDING' as ImportStatus,
      })),
    });
  }

  async getJobsByBatchId(
    batchId: string,
    filters?: {
      status?: ImportStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ jobs: ImportJob[]; total: number }> {
    const where: any = { batchId };
    if (filters?.status) where.status = filters.status;

    const [jobs, total] = await Promise.all([
      this.prisma.importJob.findMany({
        where,
        orderBy: { rowNumber: 'asc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }),
      this.prisma.importJob.count({ where }),
    ]);

    return { jobs, total };
  }

  async updateJob(
    id: string,
    data: {
      status?: ImportStatus;
      normalizedData?: Record<string, unknown>;
      errorMessage?: string;
      resultEntityId?: string;
      resultAction?: string;
    }
  ): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id },
      data: {
        ...data,
        normalizedData: data.normalizedData as any,
        processedAt: new Date(),
      },
    });
  }

  async createError(data: {
    batchId: string;
    rowNumber?: number;
    errorType: string;
    errorMessage: string;
    errorDetails?: Record<string, unknown>;
    fieldName?: string;
    fieldValue?: string;
  }): Promise<ImportError> {
    return this.prisma.importError.create({
      data: {
        ...data,
        errorDetails: data.errorDetails as any,
      },
    });
  }

  async getErrorsByBatchId(
    batchId: string,
    filters?: {
      errorType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ errors: ImportError[]; total: number }> {
    const where: any = { batchId };
    if (filters?.errorType) where.errorType = filters.errorType;

    const [errors, total] = await Promise.all([
      this.prisma.importError.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }),
      this.prisma.importError.count({ where }),
    ]);

    return { errors, total };
  }

  async deleteBatch(id: string): Promise<void> {
    await this.prisma.importBatch.delete({
      where: { id },
    });
  }
}
