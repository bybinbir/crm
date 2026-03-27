import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ImportsService } from '../imports.service';
import { CsvParser } from '../parsers/csv-parser';
import { CustomerImportValidator } from '../validators/import-validators';
import { UploadResponseDto } from '../dto/import.dto';

@Injectable()
export class ImportProcessorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importsService: ImportsService
  ) {}

  async processCustomerCsvImport(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number,
    fileMimeType: string,
    userId: string
  ): Promise<UploadResponseDto> {
    // Step 1: Create import batch
    const batch = await this.importsService.createBatch(
      {
        sourceType: 'CSV_UPLOAD',
        entityType: 'CUSTOMER',
        fileName,
        fileSize,
        fileMimeType,
      },
      userId
    );

    try {
      // Step 2: Update batch status to PROCESSING
      await this.importsService.updateBatchStatus(batch.id, 'PROCESSING');

      // Step 3: Parse CSV file
      const parseResult = CsvParser.parse(fileBuffer, {
        encoding: 'utf-8',
        skipEmptyLines: true,
        trim: true,
      });

      if (parseResult.warnings.length > 0) {
        for (const warning of parseResult.warnings) {
          await this.importsService.createError({
            batchId: batch.id,
            errorType: 'PARSING_WARNING',
            errorMessage: warning,
          });
        }
      }

      // Step 4: Map headers
      const mappedRows = parseResult.rows.map((row, index) => {
        const mappedRow: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(row)) {
          const normalizedKey =
            CsvParser.CUSTOMER_HEADER_MAPPINGS[key.toLowerCase().trim()] || key;
          mappedRow[normalizedKey] = value;
        }

        return {
          rowNumber: index + 2, // +2 because header is row 1
          rawData: row,
          mappedData: mappedRow,
        };
      });

      // Step 5: Create import jobs
      await this.importsService.createJobs(
        batch.id,
        mappedRows.map((r) => ({
          rowNumber: r.rowNumber,
          rawData: r.rawData,
        }))
      );

      // Step 6: Process each row
      let successCount = 0;
      let failedCount = 0;
      const skippedCount = 0;

      for (const row of mappedRows) {
        try {
          // Validate row
          const validationResult = CustomerImportValidator.validate(
            row.mappedData
          );

          if (!validationResult.isValid) {
            // Log validation errors
            for (const error of validationResult.errors) {
              await this.importsService.createError({
                batchId: batch.id,
                rowNumber: row.rowNumber,
                errorType: 'VALIDATION_ERROR',
                errorMessage: error.message,
                errorDetails: {
                  field: error.field,
                  value: error.value,
                  rule: error.rule,
                } as any,
                fieldName: error.field,
                fieldValue: String(error.value),
              });
            }

            // Update job status to failed
            const { jobs } = await this.importsService.getJobsByBatchId(
              batch.id
            );
            const job = jobs.find((j) => j.rowNumber === row.rowNumber);
            if (job) {
              await this.importsService.updateJob(job.id, {
                status: 'FAILED',
                errorMessage: validationResult.errors
                  .map((e) => e.message)
                  .join('; '),
              });
            }

            failedCount++;
            continue;
          }

          // Log warnings
          if (validationResult.warnings.length > 0) {
            for (const warning of validationResult.warnings) {
              await this.importsService.createError({
                batchId: batch.id,
                rowNumber: row.rowNumber,
                errorType: 'VALIDATION_WARNING',
                errorMessage: warning.message,
                errorDetails: {
                  field: warning.field,
                  value: warning.value,
                } as any,
                fieldName: warning.field,
                fieldValue: String(warning.value),
              });
            }
          }

          // Extract neighborhood from address
          const address = String(row.mappedData.address || '');
          const neighborhoodName =
            CustomerImportValidator.extractNeighborhood(address);
          const location = CustomerImportValidator.extractLocation(address);

          // Find or create neighborhood
          let neighborhoodId: string | null = null;
          if (neighborhoodName && location.district && location.city) {
            const neighborhood = await this.prisma.neighborhood.findFirst({
              where: {
                name: neighborhoodName,
                district: location.district,
                city: location.city,
              },
            });

            if (neighborhood) {
              neighborhoodId = neighborhood.id;
            } else {
              // Create neighborhood
              const newNeighborhood = await this.prisma.neighborhood.create({
                data: {
                  name: neighborhoodName,
                  district: location.district,
                  city: location.city,
                  qualityScore: 0,
                },
              });
              neighborhoodId = newNeighborhood.id;
            }
          }

          // Create customer snapshot
          const snapshot = await this.prisma.customerSnapshot.create({
            data: {
              externalId: String(row.mappedData.externalId),
              name: String(row.mappedData.name),
              email: row.mappedData.email ? String(row.mappedData.email) : null,
              phone: row.mappedData.phone ? String(row.mappedData.phone) : null,
              address: row.mappedData.address
                ? String(row.mappedData.address)
                : null,
              neighborhoodId,
              sourceType: 'CSV_UPLOAD',
              sourceBatchId: batch.id,
              sourceData: row.rawData as any,
              snapshotAt: new Date(),
            },
          });

          // Update job status to completed
          const { jobs } = await this.importsService.getJobsByBatchId(batch.id);
          const job = jobs.find((j) => j.rowNumber === row.rowNumber);
          if (job) {
            await this.importsService.updateJob(job.id, {
              status: 'COMPLETED',
              normalizedData: row.mappedData,
              resultEntityId: snapshot.id,
              resultAction: 'CREATED',
            });
          }

          successCount++;
        } catch (error) {
          // Log unexpected errors
          await this.importsService.createError({
            batchId: batch.id,
            rowNumber: row.rowNumber,
            errorType: 'PROCESSING_ERROR',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            errorDetails: {
              error: String(error),
            } as any,
          } as any);

          // Update job status to failed
          const { jobs } = await this.importsService.getJobsByBatchId(batch.id);
          const job = jobs.find((j) => j.rowNumber === row.rowNumber);
          if (job) {
            await this.importsService.updateJob(job.id, {
              status: 'FAILED',
              errorMessage:
                error instanceof Error ? error.message : 'Unknown error',
            });
          }

          failedCount++;
        }
      }

      // Step 7: Update batch statistics and status
      const finalStatus =
        failedCount === 0
          ? 'COMPLETED'
          : successCount > 0
            ? 'PARTIALLY_COMPLETED'
            : 'FAILED';

      await this.importsService.updateBatchStats(batch.id, {
        totalRows: parseResult.totalRows,
        successRows: successCount,
        failedRows: failedCount,
        skippedRows: skippedCount,
      });

      await this.importsService.updateBatchStatus(batch.id, finalStatus);

      // Step 8: Return response
      return {
        batchId: batch.id,
        status: finalStatus,
        totalRows: parseResult.totalRows,
        successRows: successCount,
        failedRows: failedCount,
        skippedRows: skippedCount,
        message:
          finalStatus === 'COMPLETED'
            ? 'Import completed successfully'
            : finalStatus === 'PARTIALLY_COMPLETED'
              ? 'Import completed with some errors'
              : 'Import failed',
      };
    } catch (error) {
      // Update batch status to failed
      await this.importsService.updateBatchStatus(
        batch.id,
        'FAILED',
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }
}
