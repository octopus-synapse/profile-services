/**
 * Nest-side bootstrap. Encapsulates `NestFactory.create` plus all the
 * `app.use*` / `configure*` calls that today live in `src/main.ts`, so
 * `main.ts` can shrink to a single call to `nestBootstrap()` once
 * Phase 4 lands a portable bootstrap entrypoint.
 *
 * For now this file is a thin re-export shim around the existing
 * configuration so the **shape** is correct: a `bootstrap` function in
 * the nest-adapter takes opaque deps and returns the running app. The
 * actual `main.ts` keeps wiring inline until the rest of the rollout
 * lands; the test that gates `@nestjs/*` imports outside the adapter
 * has `main.ts` allowlisted for the same reason.
 */

import type { INestApplication } from '@nestjs/common';
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

const PortSchema = z.coerce.number().int().min(1).max(65535).default(3001);

export async function nestBootstrap(rootModule: unknown): Promise<INestApplication> {
  const app = await NestFactory.create(rootModule as Parameters<typeof NestFactory.create>[0], {
    bufferLogs: true,
  });
  const logger = app.get(AppLoggerService);

  app.useLogger(logger);
  app.setGlobalPrefix('api');

  app.use(
    (
      req: { cookies?: Record<string, string>; headers: { cookie?: string } },
      _res: unknown,
      next: () => void,
    ) => {
      if (req.cookies === undefined) {
        const result = parseCookieHeader(req.headers.cookie);
        req.cookies = result.cookies;
        if (result.malformed.length > 0) {
          logger.warn(
            `Cookie header had ${result.malformed.length} malformed value(s): ${result.malformed.join(', ')}`,
            'CookieParser',
          );
        }
      }
      next();
    },
  );

  configureSecurityHeaders(app, isSwaggerEnabled());
  configureCors(app);

  configureValidation(app);
  configureExceptionHandling(app, logger);
  configureGlobalGuards(app);

  if (isSwaggerEnabled()) {
    configureSwagger(app);
  }

  const port = PortSchema.parse(process.env.PORT);
  await app.listen(port);

  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger UI is available at: ${await app.getUrl()}/api/docs`);
  return app;
}
