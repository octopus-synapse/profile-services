/**
 * Compat layer for migrated e2e suites.
 *
 * Exposes `createE2ETestApp()` returning the same shape the legacy
 * `_legacy/e2e/setup.ts` returned (`{ app, authHelper, cleanupHelper,
 * prisma }`), but `app` is now the `TestApp` harness — a fetch-based
 * supertest-shape wrapper around the production Elysia bootstrap.
 *
 * Migrated journey suites keep `import { createE2ETestApp } from '../setup'`
 * unchanged. Inside, `app.request.post(...).send(...)` replaces
 * `request(app.getHttpServer()).post(...).send(...)` — the chainable
 * surface is identical.
 */

import { setDefaultTimeout } from 'bun:test';
import type { PrismaClient } from '@prisma/client';
import { startTestApp, type TestApp } from '../shared';
import { AuthHelper } from './helpers/auth.helper';
import { CleanupHelper } from './helpers/cleanup.helper';

setDefaultTimeout(15000);

// AuthHelper / CleanupHelper hold a Prisma reference. When a spec
// calls `stopTestApp()` the shared module nulls its TestApp cache;
// the next `createE2ETestApp()` will get a fresh TestApp (with a
// fresh Prisma) and we have to rebuild the helpers — caching by
// (app instance) identity ensures we never hand back a helper bound
// to a closed Prisma client.
let cachedAppRef: TestApp | null = null;
let cachedAuth: AuthHelper | null = null;
let cachedCleanup: CleanupHelper | null = null;

export interface E2ETestContext {
  readonly app: TestApp;
  readonly authHelper: AuthHelper;
  readonly cleanupHelper: CleanupHelper;
  readonly prisma: PrismaClient;
}

export async function createE2ETestApp(): Promise<E2ETestContext> {
  const app = await startTestApp();
  if (cachedAppRef !== app) {
    cachedAppRef = app;
    cachedAuth = new AuthHelper(app, app.prisma);
    cachedCleanup = new CleanupHelper(app.prisma);
  }
  return {
    app,
    authHelper: cachedAuth as AuthHelper,
    cleanupHelper: cachedCleanup as CleanupHelper,
    prisma: app.prisma,
  };
}
