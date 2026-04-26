import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Global validation pipe configuration
 * Single Responsibility: Configure request validation only
 *
 * Uses nestjs-zod ZodValidationPipe globally so all createZodDto DTOs
 * are validated automatically without per-route pipe decoration. Zod
 * coerces primitives where the schema asks for it (`z.coerce.number()`,
 * etc.) — there is no need to layer the legacy `ValidationPipe` (with
 * `class-transformer`/`class-validator`) on top.
 */
export function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(new ZodValidationPipe());
}

/**
 * Global exception filter configuration
 * Single Responsibility: Configure error handling only
 */
export function configureExceptionHandling(app: INestApplication, logger: AppLoggerService): void {
  app.useGlobalFilters(new AllExceptionsFilter(logger));
}

/**
 * Global guards configuration
 * Single Responsibility: Configure authentication guards only
 */
export function configureGlobalGuards(app: INestApplication): void {
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));
}
