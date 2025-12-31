import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Environment types
 */
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Combined Environment Variables with validation decorators
 */
export class EnvironmentVariables {
  // App config
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1000)
  @Max(65535)
  @IsOptional()
  PORT: number = 3001;

  // Database
  @IsNotEmpty()
  @IsString()
  DATABASE_URL: string;

  // Auth
  @IsNotEmpty()
  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRATION?: string;

  // Redis
  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsNumber()
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  // MinIO
  @IsOptional()
  @IsString()
  MINIO_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  MINIO_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  MINIO_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  MINIO_BUCKET?: string;

  // Email
  @IsOptional()
  @IsString()
  SENDGRID_API_KEY?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM_NAME?: string;

  // Frontend
  @IsOptional()
  @IsUrl({ require_tld: false })
  FRONTEND_URL?: string;

  // Logging
  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;
}

/**
 * Validates environment variables
 */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'Unknown error';
        return `${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  return validatedConfig;
}

// Re-export individual validators for modular usage
export { DatabaseEnvironmentVariables } from './env-database.validation';
export { AuthEnvironmentVariables } from './env-auth.validation';
export { ServicesEnvironmentVariables } from './env-services.validation';
