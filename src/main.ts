import { NestFactory } from '@nestjs/core';
import {
  configureCors,
  configureSecurityHeaders,
} from '@/bounded-contexts/platform/common/config/security.config';
import {
  configureSwagger,
  isSwaggerEnabled,
} from '@/bounded-contexts/platform/common/config/swagger.config';
import {
  configureExceptionHandling,
  configureGlobalGuards,
  configureValidation,
} from '@/bounded-contexts/platform/common/config/validation.config';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { AppModule } from './app.module';

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

  // Security Configuration
  configureSecurityHeaders(app, isSwaggerEnabled());
  configureCors(app);

  // Validation & Error Handling
  configureValidation(app);
  configureExceptionHandling(app, logger);
  configureGlobalGuards(app);

  // API Documentation
  if (isSwaggerEnabled()) {
    configureSwagger(app);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);

  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger UI is available at: ${await app.getUrl()}/api/docs`);
}

void bootstrap();
