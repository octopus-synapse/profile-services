/**
 * Concurrency-safe fixtures for the shared `TestApp` harness.
 *
 * The legacy specs declared per-`describe` mutable state (`let
 * accessToken; let userId; beforeAll(...)`). Each `describe` ran one
 * test at a time, so a single token + user was enough. With Bun's
 * `--concurrent` flag (1.3+), tests inside a `describe` run in
 * parallel — that shared state immediately collides (token gets
 * overwritten by another test, the same user is mutated by two
 * tests at once, etc.).
 *
 * `freshInDbUser()` and friends return per-test fixtures: every call
 * builds a brand-new user (unique email + password), drives signup +
 * verify-email + onboarding-complete + role assignment, and hands
 * back a token + user-id that no other test holds. Tests then own
 * their fixture for their lifetime — no cross-test interference.
 *
 * Performance notes:
 *
 * - We bypass the HTTP signup → login round trip and write straight
 *   to Postgres + sign the JWT directly with `jose`. The two HTTP
 *   calls were ~150ms together (bcrypt cost 12 dominates); direct
 *   inserts + a synchronous `SignJWT` cost ~5ms.
 * - bcrypt is still run for the password hash (so tests that exercise
 *   the real login flow can verify it), but the cost is `BCRYPT_COST`
 *   from env — `.env.test` pins it to 4.
 * - The signup route's UserConsent rows are mirrored here so the
 *   ToS/Privacy gate sees a complete consent history.
 */

import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import type { TestApp } from './test-app';

export interface FreshUser {
  readonly userId: string;
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly token: string;
  /** `Authorization: Bearer <token>` header object, ready for `.set()`. */
  bearer(): { Authorization: string };
}

export interface FreshUserOptions {
  /** Skip onboarding/role-assignment so the user lands in pre-onboarded state. */
  readonly skipOnboarding?: boolean;
  /** Skip email verification so the user lands in unverified state. */
  readonly skipEmailVerify?: boolean;
  /** Assign `admin` instead of `user` after onboarding. */
  readonly admin?: boolean;
  /** Override email — useful for "reject duplicate email" tests. */
  readonly email?: string;
  /** Override password — useful for "reject weak password" tests. */
  readonly password?: string;
}

const TOS_VERSION = process.env.TOS_VERSION || '1.0.0';
const PRIVACY_VERSION = process.env.PRIVACY_POLICY_VERSION || '1.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-integration-tests-min-32-chars';
const ACCESS_TOKEN_TTL_SECONDS = Number.parseInt(
  process.env.JWT_ACCESS_TOKEN_EXPIRES_IN ?? '3600',
  10,
);

const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

async function signAccessToken(userId: string, email: string): Promise<string> {
  // Mirrors `JwtTokenGenerator.generateTokenPair` — same { sub, email }
  // payload + HS256 + the same `expiresIn`. The pipeline's
  // `JoseAuthExtractorAdapter.verifyAsync` accepts it without any
  // changes because we sign with the same secret.
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
    .sign(SECRET_KEY);
}

async function hashPassword(password: string): Promise<string> {
  // bcrypt cost is env-driven (`BCRYPT_COST=4` in .env.test). Same
  // algorithm as production — just fewer rounds — so passwords still
  // verify through the real PasswordHashService when a spec exercises
  // the actual login flow.
  return Bun.password.hash(password, {
    algorithm: 'bcrypt',
    cost: Number.parseInt(process.env.BCRYPT_COST ?? '4', 10),
  });
}

/**
 * Build a fully-onboarded user (email verified, role assigned) and
 * return a JWT access token + identity. Every call is independent —
 * the email is randomized so two parallel tests never collide.
 */
export async function freshInDbUser(app: TestApp, opts: FreshUserOptions = {}): Promise<FreshUser> {
  const id = randomUUID().slice(0, 12);
  const email = opts.email ?? `fresh-${id}@example.com`;
  const password = opts.password ?? 'FreshPass123!';
  const name = `Fresh User ${id}`;

  const passwordHash = await hashPassword(password);

  // 1. Create the User row + the consent rows + (optionally) the
  // verified-email + completed-onboarding flags in a single
  // transaction. Replaces the prior signup HTTP call (~80ms bcrypt +
  // route-handler overhead) with a single round-trip to Postgres.
  const now = new Date();
  const verifyAt = opts.skipEmailVerify ? null : now;
  const onboardedAt = opts.skipOnboarding ? null : now;

  const user = await app.prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      emailVerified: verifyAt,
      onboardingCompletedAt: onboardedAt,
      consents: {
        createMany: {
          data: [
            { documentType: 'TERMS_OF_SERVICE', version: TOS_VERSION, ipAddress: '127.0.0.1' },
            { documentType: 'PRIVACY_POLICY', version: PRIVACY_VERSION, ipAddress: '127.0.0.1' },
          ],
        },
      },
    },
    select: { id: true, email: true },
  });

  // 2. Assign the role. Onboarded users get `user`; admin fixtures
  // get `admin`. Mirrors what `OnboardingCompletionAdapter` does in
  // production — the permission gate reads from `userRoleAssignment`,
  // not the legacy `User.roles` column.
  if (!opts.skipOnboarding) {
    const roleName = opts.admin ? 'admin' : 'user';
    const role = await app.prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      await app.prisma.userRoleAssignment.create({
        data: { userId: user.id, roleId: role.id, assignedBy: 'fresh-user-fixture' },
      });
    }
  }

  // 3. Sign the JWT directly. No HTTP login → no bcrypt verify, no
  // session-cookie write, no event publish. Pipeline still verifies
  // the token because we sign with the same secret + claims.
  const token = await signAccessToken(user.id, user.email!);

  return {
    userId: user.id,
    email,
    password,
    name,
    token,
    bearer() {
      return { Authorization: `Bearer ${token}` };
    },
  };
}

/**
 * Build a fully-onboarded admin user. Same contract as `freshInDbUser`
 * with `admin: true` — exposed as a separate name so call sites read
 * naturally.
 */
export function freshInDbAdmin(
  app: TestApp,
  opts: Omit<FreshUserOptions, 'admin'> = {},
): Promise<FreshUser> {
  return freshInDbUser(app, { ...opts, admin: true });
}

/**
 * Create a resume owned by the given user and return its id. Useful
 * inside tests that need an already-existing resume but where the
 * resume itself isn't the subject under test.
 */
export async function freshResume(
  app: TestApp,
  user: FreshUser,
  overrides: Record<string, unknown> = {},
): Promise<{ resumeId: string }> {
  const res = await app.request
    .post('/api/v1/resumes')
    .set(user.bearer())
    .send({ title: `Resume ${randomUUID().slice(0, 8)}`, ...overrides });
  if (res.status !== 201) {
    throw new Error(
      `freshResume failed: ${res.status} ${typeof res.body === 'string' ? res.body : JSON.stringify(res.body)}`,
    );
  }
  const data = res.body as { data?: { id?: string } };
  const resumeId = data.data?.id;
  if (!resumeId) throw new Error(`freshResume: response had no id (${JSON.stringify(res.body)})`);
  return { resumeId };
}
