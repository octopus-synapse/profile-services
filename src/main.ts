import { NestFactory } from '@nestjs/core';
import { z } from 'zod';
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
import { parseCookieHeader } from '@/bounded-contexts/platform/common/middleware/cookie-parser.middleware';
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

  // Cookie Parser (for session-based auth) — uses lightweight built-in middleware
  app.use(
    (
      req: { cookies?: Record<string, string>; headers: { cookie?: string } },
      _res: unknown,
      next: () => void,
    ) => {
      req.cookies ??= parseCookieHeader(req.headers.cookie);
      next();
    },
  );

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

  const PortSchema = z.coerce.number().int().min(1).max(65535).default(3001);
  const port = PortSchema.parse(process.env.PORT);
  await app.listen(port);

  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger UI is available at: ${await app.getUrl()}/api/docs`);
}

void bootstrap();
