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
import { seedAuthorization } from '@/bounded-contexts/identity/authorization/seeds/seed.runner';
import { type BootstrapHandle, bootstrap } from '@/infrastructure/elysia-adapter/elysia-bootstrap';
import type { CachePort } from '@/shared-kernel/cache';
import { seedDreddFixtures } from '../../../prisma/seeds/dredd-fixtures.seed';
import { seedOnboardingSteps } from '../../../prisma/seeds/onboarding-step.seed';
import { seedResumeStyles } from '../../../prisma/seeds/resume-styles.seed';
import { seedSectionTypes } from '../../../prisma/seeds/section-type.seed';
import { seedSpokenLanguages } from '../../../prisma/seeds/spoken-language.seed';
import { seedTechSkills } from '../../../prisma/seeds/tech-skill.seed';
import { createTestRequest, type TestRequest } from './test-request';

export interface TestApp {
  /** Base URL the app listens on (`http://localhost:<ephemeralPort>`). */
  readonly baseUrl: string;
  /** supertest-shaped fetch wrapper (`app.request.post(path).send(body)`). */
  readonly request: TestRequest;
  /** Prisma client connected to the test DB. */
  readonly prisma: PrismaClient;
  /** Cache adapter — exposed so the suite-level `clearRateLimitState`
   * helper can reset rate-limit buckets between specs (`.env.test`
   * keeps `RATE_LIMIT_ENABLED=true` so security specs remain meaningful). */
  readonly cache: CachePort;
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

  // Idempotent seed of catalog + authorization data so e2e specs find
  // permissions, roles, languages, skills, section-types, etc. populated
  // even when running against a fresh `dev`/`e2e`/`test` database.
  // When sharding, the runner pre-seeds once and exports
  // `E2E_SKIP_SEED=1` so workers don't redo the work in parallel
  // (and don't fight over the catalog upserts). The admin user is
  // still ensured per-worker (cheap upsert) since some specs read
  // its id.
  if (process.env.E2E_SKIP_SEED === '1') {
    await ensureAdminUser(handle.prisma);
  } else {
    await seedTestCatalogs(handle.prisma);
  }

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
    cache: handle.cache,
    async cleanDatabase(): Promise<void> {
      for (const t of TABLES) {
        try {
          await handle.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`);
        } catch {
          // Table may not exist in every test schema — ignore.
        }
      }
    },
  };

  cached = { handle, app: testApp };
  wireProcessExitOnce();
  return testApp;
}

/**
 * Stop the cached test-app.
 *
 * Per-spec `afterAll` calls are no-ops on purpose: bun:test runs spec
 * files in parallel within the same process and they share this
 * module-level cache, so a single afterAll calling `stopTestApp()`
 * would tear down Prisma and the listener while sibling files were
 * still using them. Real teardown happens on process `beforeExit`
 * (wired below) — by then every test is done.
 */
export async function stopTestApp(): Promise<void> {
  // intentional no-op
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!@#';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';

export async function seedTestCatalogs(prisma: PrismaClient): Promise<void> {
  await seedAuthorization(prisma);

  const adminId = await ensureAdminUser(prisma);

  const tasks: Array<Promise<unknown>> = [
    seedSpokenLanguages(prisma),
    seedTechSkills(prisma),
    seedSectionTypes(prisma),
    seedOnboardingSteps(prisma),
    seedResumeStyles(prisma, adminId),
  ];
  await Promise.all(tasks);
  await seedDreddFixtures(prisma, adminId);
}

async function ensureAdminUser(prisma: PrismaClient): Promise<string> {
  // Shard-safe: with `bun test --shard X/N` running 4 processes
  // against the same Postgres, the prior `findFirst → create`
  // pattern raced and one of the workers crashed on the unique
  // email constraint. `upsert` collapses the read+write into a
  // single atomic statement.
  const hashedPassword = await Bun.password.hash(ADMIN_PASSWORD, {
    algorithm: 'bcrypt',
    cost: Number.parseInt(process.env.BCRYPT_COST ?? '10', 10),
  });
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: hashedPassword,
      name: ADMIN_NAME,
      emailVerified: new Date(),
      roles: ['role_user', 'role_admin'],
      onboardingCompletedAt: new Date(),
    },
    update: {
      // Only fill gaps — don't churn an already-good admin row.
      emailVerified: { set: new Date() },
      onboardingCompletedAt: { set: new Date() },
    },
  });

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (adminRole) {
    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      create: { userId: admin.id, roleId: adminRole.id },
      update: {},
    });
  }

  return admin.id;
}

let processExitWired = false;
function wireProcessExitOnce(): void {
  if (processExitWired) return;
  processExitWired = true;
  const stop = async (): Promise<void> => {
    if (!cached) return;
    try {
      await cached.handle.stop();
    } finally {
      cached = null;
    }
  };
  process.once('beforeExit', stop);
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
