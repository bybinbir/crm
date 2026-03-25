import { IsString, IsUrl, IsInt, Min, IsOptional } from 'class-validator';
import { IntegrationProvider } from '@prisma/client';

export class CreateIntegrationConfigDto {
  @IsString()
  name!: string;

  @IsUrl()
  baseUrl!: string;

  @IsString()
  apiKey!: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number;
}
