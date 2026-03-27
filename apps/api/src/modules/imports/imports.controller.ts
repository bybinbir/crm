import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportProcessorService } from './services/import-processor.service';
import { UploadResponseDto } from './dto/import.dto';

@Controller('api/v1/imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly processorService: ImportProcessorService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any
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

    const userId = req.user.userId;

    const result = await this.processorService.processCustomerCsvImport(
      file.buffer,
      file.originalname,
      file.size,
      file.mimetype,
      userId
    );

    return result;
  }
}
