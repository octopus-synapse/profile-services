import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logger/logger.service';
import {
  configureSecurityHeaders,
  configureCors,
} from './common/config/security.config';
import {
  configureValidation,
  configureExceptionHandling,
  configureGlobalGuards,
} from './common/config/validation.config';
import {
  configureSwagger,
  isSwaggerEnabled,
} from './common/config/swagger.config';

/**
 * Bootstrap the NestJS application
 *
 * Uncle Bob's SRP: This function only orchestrates startup.
 * All configuration logic is delegated to specialized modules.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLoggerService);

  app.useLogger(logger);
  app.setGlobalPrefix('api');

  const swaggerEnabled = isSwaggerEnabled();

  // Configure application (each function has single responsibility)
  configureSecurityHeaders(app, swaggerEnabled);
  configureCors(app);
  configureExceptionHandling(app, logger);
  configureValidation(app);
  configureGlobalGuards(app);

  if (swaggerEnabled) {
    configureSwagger(app);
  }

  const port = process.env.PORT ?? '3001';
  await app.listen(port);

  logStartupInfo(logger, port, swaggerEnabled);
}

function logStartupInfo(
  logger: AppLoggerService,
  port: string | number,
  swaggerEnabled: boolean,
): void {
  logger.log(
    `Application running on: http://localhost:${port}/api`,
    'Bootstrap',
  );
  logger.log(`Health check: http://localhost:${port}/api/health`, 'Bootstrap');
  if (swaggerEnabled) {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

void bootstrap();
