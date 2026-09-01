/**
 * E2E suite setup. `createE2ETestApp()` returns `{ app, authHelper,
 * cleanupHelper, prisma }` where `app` is the `TestApp` harness — a
 * fetch-based supertest-shape wrapper around the production Elysia
 * bootstrap. Suites use `app.request.post(...).send(...)`.
 */

import { beforeEach, setDefaultTimeout } from 'bun:test';
import type { PrismaClient } from '@prisma/client';
import { startTestApp, type TestApp } from '../shared';
import { AuthHelper } from '../shared/auth.helper';
import { CleanupHelper } from './helpers/cleanup.helper';

setDefaultTimeout(15000);

/**
 * Object storage for the export specs.
 *
 * `.env.test` blanks `MINIO_*` so the integration suite runs with
 * `S3UploadService` disabled — cheap, and it needs no bucket. The e2e
 * stack, though, ships a real MinIO (`infra/docker/docker-compose.e2e.yml`,
 * host-mapped on 9100 with the bucket pre-created by `minio-init`), and
 * the export journey asserts a presigned download URL. Without these the
 * service disabled itself and `GET /v1/export/resume/docx` could never
 * return one.
 *
 * Assigned only when unset, so CI (which points at its own container)
 * and anyone with a bespoke stack keep control.
 */
process.env.MINIO_ENDPOINT ||= `http://localhost:${process.env.E2E_MINIO_PORT ?? '9100'}`;
process.env.MINIO_ACCESS_KEY ||= 'minioadmin';
process.env.MINIO_SECRET_KEY ||= 'minioadmin';
process.env.MINIO_BUCKET ||= 'profile-uploads';

/**
 * Global rate-limit reset. `.env.test` keeps `RATE_LIMIT_ENABLED=true`
 * (security specs need the gate live), but each test fixture signs up
 * 1–3 fresh users — without resetting the buckets between specs the
 * suite-wide IP / auth-endpoint quotas get exhausted after a handful of
 * tests and every subsequent signup returns 429.
 *
 * `bun:test` exposes `beforeEach` at module scope, applied to every
 * `it()` defined in any spec that imports this setup file. If Redis
 * is down the deletePattern call rejects — we let it propagate so the
 * failure is loud (a 429-cascade is much worse to debug than a single
 * "Redis unreachable" report). When the cache is intentionally
 * disabled (`REDIS_HOST` unset), `CacheCoreService` short-circuits and
 * returns without throwing, so this hook is a free no-op there.
 */
beforeEach(async () => {
  if (!cachedAppRef) return;
  await cachedAppRef.cache.deletePattern('ratelimit:*');
});

/**
 * Manually clear the rate-limit state. Most specs don't need this — the
 * global `beforeEach` above runs before every `it()`. Exported for the
 * rare case of multiple sub-flows inside a single `it()` that all
 * trigger the per-endpoint quota (e.g. 2fa enrol + verify + lockout).
 */
export async function clearRateLimitState(key?: string): Promise<void> {
  if (!cachedAppRef) return;
  const pattern = key ? `ratelimit:${key}*` : 'ratelimit:*';
  await cachedAppRef.cache.deletePattern(pattern);
}

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
    cachedAuth = new AuthHelper(app);
    cachedCleanup = new CleanupHelper(app.prisma);
  }
  return {
    app,
    authHelper: cachedAuth as AuthHelper,
    cleanupHelper: cachedCleanup as CleanupHelper,
    prisma: app.prisma,
  };
}
