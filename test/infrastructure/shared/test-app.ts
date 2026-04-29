/**
 * Test-app harness for the Elysia + Bun runtime.
 *
 * Boots the same `bootstrap()` the production binary uses, on an
 * ephemeral port. Single source of truth so e2e + integration suites
 * exercise the production composition graph (no second bootstrap, no
 * NestFactory.create equivalent).
 *
 * Usage:
 *   ```ts
 *   import { startTestApp, stopTestApp, type TestApp } from '@/test/infrastructure/shared/test-app';
 *
 *   let app: TestApp;
 *   beforeAll(async () => { app = await startTestApp(); });
 *   afterAll(async () => { await stopTestApp(); });
 *
 *   it('GET /api/health', async () => {
 *     const res = await app.request.get('/api/health');
 *     expect(res.status).toBe(200);
 *   });
 *   ```
 *
 * One shared instance per test process — bun:test runs files inside
 * a worker that shares the module graph, so caching here means each
 * worker boots one Elysia + one Prisma.
 */

import type { PrismaClient } from '@prisma/client';
import { bootstrap, type BootstrapHandle } from '@/infrastructure/elysia-adapter/elysia-bootstrap';
import { createTestRequest, type TestRequest } from './test-request';

export interface TestApp {
  /** Base URL the app listens on (`http://localhost:<ephemeralPort>`). */
  readonly baseUrl: string;
  /** supertest-shaped fetch wrapper (`app.request.post(path).send(body)`). */
  readonly request: TestRequest;
  /** Prisma client connected to the test DB. */
  readonly prisma: PrismaClient;
  /** Wipe every domain table; safe to call between tests. */
  cleanDatabase(): Promise<void>;
}

let cached: { handle: BootstrapHandle; app: TestApp } | null = null;

export async function startTestApp(): Promise<TestApp> {
  if (cached) return cached.app;

  // Boot on an ephemeral port. The bootstrap reads PORT from
  // process.env, so swap it in for the duration of the call.
  const previousPort = process.env.PORT;
  process.env.PORT = '0';
  const handle = await bootstrap();
  if (previousPort !== undefined) process.env.PORT = previousPort;
  else delete process.env.PORT;

  const port = (handle.app.server?.port as number | undefined) ?? 0;
  if (!port) {
    throw new Error('test-app: Elysia did not expose a listening port');
  }
  const baseUrl = `http://localhost:${port}`;
  const request = createTestRequest(baseUrl);

  const TABLES = [
    'AuditLog',
    'NotificationDelivery',
    'Notification',
    'PostReaction',
    'PostBookmark',
    'PostComment',
    'Post',
    'JobApplicationEvent',
    'JobApplication',
    'JobBookmark',
    'Job',
    'ResumeShareAlias',
    'ResumeShare',
    'ResumeSectionItem',
    'ResumeSection',
    'ResumeVersion',
    'Resume',
    'Session',
    'PasswordResetToken',
    'EmailVerificationToken',
    'OAuthAccount',
    'UserRole',
    'User',
  ] as const;

  const testApp: TestApp = {
    baseUrl,
    request,
    prisma: handle.prisma,
    async cleanDatabase(): Promise<void> {
      for (const t of TABLES) {
        try {
          await handle.prisma.$executeRawUnsafe(
            `TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`,
          );
        } catch {
          // Table may not exist in every test schema — ignore.
        }
      }
    },
  };

  cached = { handle, app: testApp };
  return testApp;
}

/** Stop the cached test-app. Call from `afterAll`. */
export async function stopTestApp(): Promise<void> {
  if (!cached) return;
  await cached.handle.stop();
  cached = null;
}
