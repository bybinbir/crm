import type { ImportEntityType, ImportSourceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateImportBatchDto {
  @IsEnum([
    'CSV_UPLOAD',
    'EXCEL_UPLOAD',
    'ISSMANAGER_API',
    'ISSMANAGER_EXPORT',
    'DATABASE_EXPORT',
    'MANUAL_ENTRY',
  ])
  sourceType!: ImportSourceType;

  @IsEnum(['CUSTOMER', 'PERSONNEL', 'FINANCE', 'NEIGHBORHOOD'])
  entityType!: ImportEntityType;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  fileSize?: number;

  @IsOptional()
  @IsString()
  fileMimeType?: string;
}

export class ImportBatchResponseDto {
  id!: string;
  sourceType!: string;
  entityType!: string;
  status!: string;
  fileName?: string;
  totalRows!: number;
  successRows!: number;
  failedRows!: number;
  skippedRows!: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ImportJobResponseDto {
  id!: string;
  batchId!: string;
  rowNumber!: number;
  status!: string;
  rawData!: Record<string, unknown>;
  normalizedData?: Record<string, unknown>;
  errorMessage?: string;
  resultEntityId?: string;
  resultAction?: string;
  processedAt?: Date;
  createdAt!: Date;
}

export class ImportErrorResponseDto {
  id!: string;
  batchId!: string;
  rowNumber?: number;
  errorType!: string;
  errorMessage!: string;
  errorDetails?: Record<string, unknown>;
  fieldName?: string;
  fieldValue?: string;
  createdAt!: Date;
}

export class ImportPreviewDto {
  headers!: string[];
  rows!: Record<string, unknown>[];
  totalRows!: number;
  detectedEncoding!: string;
  warnings!: string[];
}

export class UploadResponseDto {
  batchId!: string;
  status!: string;
  totalRows!: number;
  successRows!: number;
  failedRows!: number;
  skippedRows!: number;
  message!: string;
}

export class BatchPreviewDto {
  batch!: ImportBatchResponseDto;
  sampleJobs!: ImportJobResponseDto[];
  sampleErrors!: ImportErrorResponseDto[];
}
