import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { ImportSourceType } from '@prisma/client';
import type { Express } from 'express';

import {
  CurrentUser,
  CurrentUserData,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { UploadResponseDto } from './dto/import.dto';
import { ImportProcessorService } from './services/import-processor.service';

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly processorService: ImportProcessorService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('sourceType') sourceType: ImportSourceType | undefined,
    @CurrentUser() user: CurrentUserData
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/csv',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only CSV files are accepted.'
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 10MB.');
    }

    // Default to CSV_UPLOAD for backward compatibility
    const effectiveSourceType = sourceType || 'CSV_UPLOAD';

    const result = await this.processorService.processCustomerImport(
      file.buffer,
      file.originalname,
      file.size,
      file.mimetype,
      user.id,
      effectiveSourceType
    );

    return result;
  }
}
