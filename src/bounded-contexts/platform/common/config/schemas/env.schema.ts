/**
 * Environment Configuration Validation
 *
 * Validates environment variables with Zod.
 * Consumers get a simple validateEnv() function.
 */

import { z } from 'zod';

const EnvironmentEnum = z.enum(['development', 'production', 'test']);

/**
 * Complete environment schema with all required and optional variables
 */
const EnvironmentSchema = z.object({
  // App config
  NODE_ENV: EnvironmentEnum.default('development'),
  PORT: z.coerce.number().int().min(1000).max(65535).default(3001),

  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('7d'),
  // When 'true', EmailVerifiedGuard is bypassed — safe default for dev &
  // E2E, should be unset (or 'false') in production so unverified accounts
  // can't hit protected endpoints.
  SKIP_EMAIL_VERIFICATION: z.string().default('true'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // MinIO/S3
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().default('profile-uploads'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_PORT: z.coerce.number().int().optional(),

  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().default('false'),
  EMAIL_FROM: z.string().email().default('noreply@profile.com'),
  EMAIL_FROM_NAME: z.string().default('ProFile'),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  UI_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Internal integrations
  INTERNAL_API_TOKEN: z.string().min(1).optional(),

  // OpenAI (AI features fail at call time if unset)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // SendGrid (fallback for transactional email when SMTP_HOST is not set)
  SENDGRID_API_KEY: z.string().optional(),

  // LibreTranslate
  LIBRETRANSLATE_URL: z.string().url().default('http://libretranslate:5000'),
  LIBRETRANSLATE_API_KEY: z.string().optional(),

  // OAuth — GitHub
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // OAuth — LinkedIn
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),

  // OAuth — shared callback host (backend base URL used to build redirect URIs)
  OAUTH_CALLBACK_BASE: z.string().url().default('http://localhost:3001'),

  // Password reset tokens
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  // Account lockout
  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_DURATION_MINUTES: z.coerce.number().int().positive().default(15),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentSchema>;

/**
 * Validates environment variables.
 * Throws error with detailed messages if validation fails.
 *
 * @param config - Raw environment variables (process.env)
 * @returns Validated and typed environment variables
 * @throws Error if validation fails
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  try {
    return EnvironmentSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validates environment variables without throwing.
 * Returns validation result with typed data or errors.
 */
export function validateEnvSafe(config: Record<string, unknown>) {
  const result = EnvironmentSchema.safeParse(config);

  if (result.success) {
    return { success: true as const, data: result.data };
  }

  return {
    success: false as const,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}
