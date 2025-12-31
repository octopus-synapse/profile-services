import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  Max,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Services Environment Variables
 * Includes: Redis, MinIO, Email, Frontend, Logging, and App config
 */
export class ServicesEnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1000)
  @Max(65535)
  @IsOptional()
  PORT: number = 3001;

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

  // Email (SendGrid)
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

export { Environment };
