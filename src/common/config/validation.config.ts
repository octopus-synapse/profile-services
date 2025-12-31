import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Global validation pipe configuration
 * Single Responsibility: Configure request validation only
 */
export function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
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
