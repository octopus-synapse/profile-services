import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Global validation pipe configuration
 * Single Responsibility: Configure request validation only
 *
 * Architecture: Validation is handled by validation pipes from
 * @/shared-kernel at the route level.
 * Global pipe is kept for legacy compatibility but does minimal work.
 */
export function configureValidation(app: INestApplication): void {
  // Minimal global validation - actual validation done at route level
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}

/**
 * Global exception filter configuration
 * Single Responsibility: Configure error handling only
 */
export function configureExceptionHandling(
  app: INestApplication,
  logger: AppLoggerService,
): void {
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
