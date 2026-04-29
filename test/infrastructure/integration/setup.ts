/**
 * Compat layer for migrated integration suites.
 *
 * Exposes the same surface the legacy `_legacy/integration/setup.ts`
 * exported, but delegates to the new `TestApp` harness (Elysia
 * bootstrap on an ephemeral port). Each migrated spec file just
 * keeps its existing `from './setup'` import — no per-file
 * conversion needed.
 *
 * The `getRequest()` legacy callers used `request(app.getHttpServer())
 * .post(...).send(...)` chains. Our `TestRequest` wrapper has the same
 * shape so those calls land unchanged.
 */

import { setDefaultTimeout } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { AuthHelper, startTestApp, stopTestApp, type TestApp, type TestRequest } from '../shared';

// Load test env so DATABASE_URL / REDIS_HOST / JWT_SECRET land before
// the bootstrap reads process.env.
config({ path: join(__dirname, '..', '..', '..', '.env.test'), override: false });
setDefaultTimeout(15000);

interface TestContext {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  resumeId: string | null;
}

export const TEST_USER: { email: string; password: string; name: string } = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Integration Test User',
};

export const testContext: TestContext = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  resumeId: null,
};

// Auth helper instance is cached per (test-app instance). When a spec
// calls `stopTestApp()` the shared module nulls its cache; on the next
// `getApp()` we get a brand-new TestApp (with a brand-new Prisma) and
// have to rebuild AuthHelper around it.
let cachedAppRef: TestApp | null = null;
let cachedAuth: AuthHelper | null = null;

// ─── Unique ID helpers ────────────────────────────────────────────

export function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

export function uniqueTestUsername(prefix = 'testuser'): string {
  return `${prefix}_${randomUUID().slice(0, 8).replace(/-/g, '')}`;
}

export function uniqueTestSlug(prefix = 'test'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function uniqueTestId(): string {
  return randomUUID().slice(0, 12);
}

// ─── App lifecycle ────────────────────────────────────────────────

export async function getApp(): Promise<TestApp> {
  const app = await startTestApp();
  if (cachedAppRef !== app) {
    cachedAppRef = app;
    cachedAuth = new AuthHelper(app);
  }
  return app;
}

export function getRequest(): TestRequest {
  if (!cachedAppRef) {
    throw new Error('App not initialized. Call getApp() first.');
  }
  return cachedAppRef.request;
}

export function getPrisma(): PrismaClient {
  if (!cachedAppRef) {
    throw new Error('App not initialized. Call getApp() first.');
  }
  return cachedAppRef.prisma;
}

/**
 * No-op: the shared `TestApp` instance lives for the worker lifetime;
 * `stopTestApp()` runs once at process exit. Calling `closeApp()`
 * mid-suite would tear down the listener that other parallel files
 * are still using.
 */
export async function closeApp(): Promise<void> {
  // intentionally no-op
}

// ─── Auth helpers ─────────────────────────────────────────────────

export async function createTestUserAndLogin(
  customUser?: Partial<{ email: string; password: string; name: string }>,
): Promise<{ accessToken: string; userId: string; refreshToken: string }> {
  const app = await getApp();
  const auth = cachedAuth ?? new AuthHelper(app);

  const overrides = {
    email: customUser?.email ?? uniqueTestEmail('test'),
    password: customUser?.password ?? TEST_USER.password,
    name: customUser?.name ?? TEST_USER.name,
  };

  const baseUser = auth.createTestUser();
  baseUser.email = overrides.email;
  baseUser.password = overrides.password;
  baseUser.name = overrides.name;

  const ready = await auth.registerAndLogin(baseUser);
  if (!ready.token || !ready.userId) {
    throw new Error('createTestUserAndLogin: missing token/userId after registerAndLogin');
  }

  // Accept ToS/Privacy for the consent guard — mirrors legacy behaviour.
  await acceptTosForUser(ready.userId);

  testContext.accessToken = ready.token;
  testContext.refreshToken = ready.refreshCookie ?? '';
  testContext.userId = ready.userId;

  return {
    accessToken: ready.token,
    userId: ready.userId,
    refreshToken: ready.refreshCookie ?? '',
  };
}

export function authHeader(token?: string): { Authorization: string } {
  const t = token ?? testContext.accessToken;
  if (!t) throw new Error('No access token available. Login first.');
  return { Authorization: `Bearer ${t}` };
}

export function unwrapApiData<T>(body: unknown): T {
  const envelope =
    body && typeof body === 'object' && 'data' in body ? (body as { data?: unknown }).data : body;
  if (
    envelope &&
    typeof envelope === 'object' &&
    !Array.isArray(envelope) &&
    Object.keys(envelope).length === 1
  ) {
    const [onlyKey] = Object.keys(envelope);
    return (envelope as Record<string, unknown>)[onlyKey] as T;
  }
  return envelope as T;
}

// ─── DB helpers ───────────────────────────────────────────────────

export async function verifyUserEmail(userId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
}

export async function acceptTosForUser(userId: string): Promise<void> {
  const prisma = getPrisma();
  await acceptTosWithPrisma(prisma, userId);
}

export async function acceptTosWithPrisma(prisma: PrismaClient, userId: string): Promise<void> {
  const tosVersion = process.env.TOS_VERSION || '1.0.0';
  const privacyPolicyVersion = process.env.PRIVACY_POLICY_VERSION || '1.0.0';

  await prisma.userConsent.upsert({
    where: {
      userId_documentType_version: {
        userId,
        documentType: 'TERMS_OF_SERVICE',
        version: tosVersion,
      },
    },
    update: {},
    create: {
      userId,
      documentType: 'TERMS_OF_SERVICE',
      version: tosVersion,
      ipAddress: '127.0.0.1',
      userAgent: 'Integration Test',
    },
  });

  await prisma.userConsent.upsert({
    where: {
      userId_documentType_version: {
        userId,
        documentType: 'PRIVACY_POLICY',
        version: privacyPolicyVersion,
      },
    },
    update: {},
    create: {
      userId,
      documentType: 'PRIVACY_POLICY',
      version: privacyPolicyVersion,
      ipAddress: '127.0.0.1',
      userAgent: 'Integration Test',
    },
  });
}

export async function refreshSectionTypeCache(): Promise<void> {
  // Legacy hook for `SectionTypeRepository.refresh()`. The new bootstrap
  // exposes the repo via composition; surface remains for source-compat
  // until tests actually need it.
}

// Legacy hooks used by auth/2fa/password-reset suites. The legacy code
// reached into the rate-limit and user-cache services directly; the
// migrated bootstrap doesn't surface a global cache instance, but the
// rate-limit buckets live in Redis and tests run against a flushed
// instance, so these calls are safe no-ops.
export async function clearRateLimitState(_key?: string): Promise<void> {
  // intentionally no-op
}

export async function clearUserCacheState(_userId?: string): Promise<void> {
  // intentionally no-op
}

export function getCacheService(): {
  delete(key: string): Promise<void>;
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
} {
  return {
    async delete() {},
    async get<T = unknown>() {
      return null as T | null;
    },
    async set() {},
  };
}

// Cleanup hook for `afterAll` blocks that want to release the worker.
export async function teardownAll(): Promise<void> {
  await stopTestApp();
  cachedAppRef = null;
  cachedAuth = null;
}
