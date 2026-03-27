import { plainToInstance } from 'class-transformer';
import { IsString, IsPort, MinLength, validateSync } from 'class-validator';

/**
 * Environment variables validation schema
 * Ensures all required configuration is present and valid at startup
 */
export class EnvironmentVariables {
  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters',
  })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET must be at least 32 characters',
  })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @MinLength(32, { message: 'ENCRYPTION_KEY must be at least 32 characters' })
  ENCRYPTION_KEY!: string;

  @IsString()
  @MinLength(10, { message: 'DATABASE_URL must be at least 10 characters' })
  DATABASE_URL!: string;

  @IsPort()
  PORT: string = '4000';

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  NODE_ENV: string = 'development';
}

/**
 * Validates environment variables at application startup
 * Throws detailed error if any required variable is missing or invalid
 */
export function validate(
  config: Record<string, unknown>
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validatedConfig;
}
