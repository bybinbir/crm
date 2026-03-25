import { IsString, IsUrl, IsInt, Min, IsOptional } from 'class-validator';

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
