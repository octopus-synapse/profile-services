/**
 * Integration suite setup. Delegates to the `TestApp` harness (Elysia
 * bootstrap on an ephemeral port). Suites use `getRequest()` returning
 * a `TestRequest` wrapper with `.post(...).send(...)` chains.
 */

import { setDefaultTimeout } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { waitForPendingHandlers } from '@/shared-kernel/event-bus/pending-handler-tracker';
import {
  AuthHelper,
  freshInDbUser,
  startTestApp,
  stopTestApp,
  type TestApp,
  type TestRequest,
} from '../shared';

export { waitForPendingHandlers };

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
let _cachedAuth: AuthHelper | null = null;

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
    _cachedAuth = new AuthHelper(app);
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

// ─── Signup helpers ───────────────────────────────────────────────

/**
 * Wraps a signup payload with the LGPD consent fields the
 * `/api/accounts` schema now requires (`acceptedTosVersion`,
 * `acceptedPrivacyVersion`). Specs predating that requirement still
 * build `{ email, password, name }` objects — wrap them through this
 * before posting so the schema accepts the body.
 */
export function signupBody<T extends Record<string, unknown>>(
  base: T,
): T & { acceptedTosVersion: string; acceptedPrivacyVersion: string } {
  return {
    ...base,
    acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
    acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
  };
}

// ─── Auth helpers ─────────────────────────────────────────────────

export async function createTestUserAndLogin(
  customUser?: Partial<{ email: string; password: string; name: string }>,
): Promise<{ accessToken: string; userId: string; refreshToken: string }> {
  const app = await getApp();

  // Bypass HTTP signup → login (real bcrypt + 2 round-trips, ~150ms each)
  // and provision the user + consent rows + JWT directly in Postgres.
  // Same fixture the e2e suite uses; no spec relies on the legacy
  // refreshToken (real refresh-token flow lives in `auth.integration`,
  // which exercises the actual login route end-to-end).
  const fresh = await freshInDbUser(app, {
    email: customUser?.email,
    password: customUser?.password,
  });

  testContext.accessToken = fresh.token;
  testContext.refreshToken = '';
  testContext.userId = fresh.userId;

  return {
    accessToken: fresh.token,
    userId: fresh.userId,
    refreshToken: '',
  };
}

export function authHeader(token?: string): { Authorization: string } {
  const t = token ?? testContext.accessToken;
  if (!t) throw new Error('No access token available. Login first.');
  return { Authorization: `Bearer ${t}` };
}

/**
 * @deprecated Q18 stripped the `{data: ...}` envelope from 2xx
 * responses. This helper was guessing-mode (peel `data` if present,
 * peel single-key objects, otherwise pass-through) — it papered over
 * shape drift instead of catching it.
 *
 * New code reads `res.body` directly and asserts the shape via
 * `expectResource(res, Schema)` from `./helpers/expect-resource`.
 *
 * Kept as a pass-through for existing call sites until they're
 * migrated, so deleting the import doesn't cascade-break the suite.
 * The body shape it returns now matches what the route actually
 * emits — the guessing modes were removed.
 */
export function unwrapApiData<T>(body: unknown): T {
  return body as T;
}

// ─── DB helpers ───────────────────────────────────────────────────

export async function verifyUserEmail(userId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
}

/**
 * Assigns the system `user` role to a userId so the new permission
 * pipeline lets domain routes through. Mirrors what the
 * onboarding-completion adapter does in production. Specs that
 * bypass the onboarding flow but still need authenticated access
 * (verify email + accept ToS, then immediately hit a protected
 * route) call this directly.
 */
export async function assignUserRole(userId: string): Promise<void> {
  const prisma = getPrisma();
  const role = await prisma.role.findUnique({ where: { name: 'user' } });
  if (!role) return;
  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    create: { userId, roleId: role.id, assignedBy: 'integration-test-setup' },
    update: {},
  });
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

/**
 * Clear rate-limit buckets in Redis. `key` is the prefix-specific
 * fragment when callers want surgical resets (e.g. `'ip:127.0.0.1'`);
 * omit to flush every `ratelimit:*` key.
 *
 * `.env.test` keeps `RATE_LIMIT_ENABLED=true` so the security specs
 * remain meaningful, which means a long-running suite would otherwise
 * exhaust the per-IP / per-user buckets after a few signups and the
 * remaining tests all 429. Resetting between specs preserves the
 * limit's correctness *within* a spec without leaking state across.
 */
export async function clearRateLimitState(key?: string): Promise<void> {
  if (!cachedAppRef) return;
  const pattern = key ? `ratelimit:${key}*` : 'ratelimit:*';
  // `CacheCoreService.deletePattern` short-circuits when the adapter is
  // disabled (no REDIS_HOST) — calling it on a unit-test setup is a
  // free no-op. A genuine Redis error here (unreachable, auth) does
  // throw, which is what we want: a loud failure beats every downstream
  // test silently 429-ing in the background.
  await cachedAppRef.cache.deletePattern(pattern);
}

export async function clearUserCacheState(_userId?: string): Promise<void> {
  // intentionally no-op
}

/**
 * Shorthand for the IP-keyed rate-limit buckets the integration specs
 * hit repeatedly. Drop in a top-level `beforeEach` for any spec that
 * does multiple signups / logins / password-reset / email-verification
 * requests per run.
 *
 * Routes covered (all IP-keyed; values from each route's
 * `metadata.points / duration`):
 *   - POST /v1/accounts               10 / 600s
 *   - POST /v1/auth/login             30 /  60s
 *   - POST /v1/auth/login/verify-2fa  30 /  60s
 *   - POST /v1/auth/email-verification/verify  3 / 300s
 *   - POST /v1/auth/password/reset     5 / 3600s  (the slow bucket
 *     that caught password-reset specs even when no other auth
 *     route was getting throttled)
 *
 * userId-keyed buckets (e.g. password change with currentPassword)
 * stay live so specs exercising those throttles still get coverage.
 */
export async function clearAuthRateLimits(): Promise<void> {
  await Promise.all([
    clearRateLimitState('*:POST:/v1/accounts'),
    clearRateLimitState('*:POST:/v1/auth/login'),
    clearRateLimitState('*:POST:/v1/auth/login/verify-2fa'),
    clearRateLimitState('*:POST:/v1/auth/email-verification/verify'),
    clearRateLimitState('*:POST:/v1/auth/password/reset'),
    // The actual route is `/v1/auth/reset-password` (singular) — the
    // path lives in password-management.routes.ts. Both spellings live
    // in the codebase historically; we clear both to be safe.
    clearRateLimitState('*:POST:/v1/auth/reset-password'),
    clearRateLimitState('*:POST:/v1/auth/forgot-password'),
    // DELETE /v1/accounts re-auth gate: 3/60s per userId.
    clearRateLimitState('*:DELETE:/v1/accounts'),
  ]);
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
  _cachedAuth = null;
}
