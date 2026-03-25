import { IsString, IsUrl, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class UpdateIntegrationConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
