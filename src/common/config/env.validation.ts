import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DatabaseEnvironmentVariables } from './env-database.validation';
import { AuthEnvironmentVariables } from './env-auth.validation';
import {
  ServicesEnvironmentVariables,
  Environment,
} from './env-services.validation';

/**
 * Combined Environment Variables
 * Merges all environment variable classes
 */
export class EnvironmentVariables
  implements
    DatabaseEnvironmentVariables,
    AuthEnvironmentVariables,
    ServicesEnvironmentVariables
{
  // App config
  NODE_ENV: Environment = Environment.Development;
  PORT: number = 3001;

  // Database
  DATABASE_URL: string;

  // Auth
  JWT_SECRET: string;
  JWT_EXPIRATION?: string;

  // Redis
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;

  // MinIO
  MINIO_ENDPOINT?: string;
  MINIO_ACCESS_KEY?: string;
  MINIO_SECRET_KEY?: string;
  MINIO_BUCKET?: string;

  // Email
  SENDGRID_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;

  // Frontend
  FRONTEND_URL?: string;

  // Logging
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

// Re-export for convenience
export { DatabaseEnvironmentVariables };
export { AuthEnvironmentVariables };
export { ServicesEnvironmentVariables, Environment };
