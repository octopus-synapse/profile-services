/**
 * App Controller Response DTOs — Zod-first.
 *
 * Used by the root `AppController` (legacy class-based controller). Each
 * shape is exported as a Zod schema plus a `createZodDto`-derived class so
 * `@nestjs/swagger`/`nestjs-zod` discovery keeps working unchanged.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

extendZodWithOpenApi(z);

const HelloDataSchema = z.object({
  message: z.string().openapi({ example: 'Hello from Profile Services!' }),
});

export class HelloDataDto extends createZodDto(HelloDataSchema) {}

const HealthDataSchema = z.object({
  status: z.string().openapi({ example: 'ok' }),
  timestamp: z.string().openapi({ example: '2026-02-25T10:30:00.000Z' }),
});

export class HealthDataDto extends createZodDto(HealthDataSchema) {}

const VersionDataSchema = z.object({
  service: z.string().openapi({ example: 'profile-services' }),
  version: z.string().openapi({ example: 'v1.2.3' }),
  contracts_version: z.string().openapi({ example: 'v1.0.0' }),
  environment: z.string().openapi({ example: 'production' }),
  deployed_at: z.string().openapi({ example: '2026-02-25T10:00:00.000Z' }),
  git_tag: z.string().openapi({ example: 'v1.2.3' }),
  is_rollback: z.boolean().openapi({ example: false }),
});

export class VersionDataDto extends createZodDto(VersionDataSchema) {}

const OpenApiSpecDataSchema = z.object({
  spec: z.record(z.string(), z.unknown()).describe('OpenAPI specification object'),
});

export class OpenApiSpecDataDto extends createZodDto(OpenApiSpecDataSchema) {}
