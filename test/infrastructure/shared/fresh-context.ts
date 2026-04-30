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
 * `freshUser()` and friends return per-test fixtures: every call
 * builds a brand-new user (unique email + password), drives signup +
 * verify-email + onboarding-complete + role assignment, and hands
 * back a token + user-id that no other test holds. Tests then own
 * their fixture for their lifetime — no cross-test interference.
 *
 * Usage:
 *
 *   it('creates a resume', async () => {
 *     const me = await freshUser(app);
 *     const r = await app.request.post('/api/v1/resumes')
 *       .set(me.bearer())
 *       .send({ title: 'x' });
 *     expect(r.status).toBe(201);
 *   });
 */

import { randomUUID } from 'node:crypto';
import type { TestApp } from './test-app';

export interface FreshUser {
  readonly userId: string;
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly token: string;
  readonly refreshCookie?: string;
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

/**
 * Build a fully-onboarded user (email verified, role assigned) and
 * return the JWT access token + identity. Every call is independent
 * — the email is randomized so two parallel tests never collide.
 */
export async function freshUser(app: TestApp, opts: FreshUserOptions = {}): Promise<FreshUser> {
  const id = randomUUID().slice(0, 12);
  const email = opts.email ?? `fresh-${id}@example.com`;
  const password = opts.password ?? 'FreshPass123!';
  const name = `Fresh User ${id}`;

  // Signup carries the LGPD consent fields so the schema accepts the body.
  const signup = await app.request.post('/api/accounts').send({
    email,
    password,
    name,
    acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
    acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
  });
  if (signup.status >= 400) {
    throw new Error(
      `freshUser signup failed: ${signup.status} ${typeof signup.body === 'string' ? signup.body : JSON.stringify(signup.body)}`,
    );
  }
  const userRow = await app.prisma.user.findUnique({ where: { email } });
  if (!userRow) throw new Error(`freshUser: user row missing after signup (${email})`);
  const userId = userRow.id;

  if (!opts.skipEmailVerify) {
    await app.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }

  if (!opts.skipOnboarding) {
    await app.prisma.user.update({
      where: { id: userId },
      data: { hasCompletedOnboarding: true, onboardingCompletedAt: new Date() },
    });
    const roleName = opts.admin ? 'admin' : 'user';
    const role = await app.prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      await app.prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        create: { userId, roleId: role.id, assignedBy: 'fresh-user-fixture' },
        update: {},
      });
    }
  }

  // Login — returns the access token. We rely on the same login
  // path the real client takes so the JWT carries whatever claims
  // production expects.
  const login = await app.request.post('/api/auth/login').send({ email, password });
  if (login.status >= 400) {
    throw new Error(
      `freshUser login failed: ${login.status} ${typeof login.body === 'string' ? login.body : JSON.stringify(login.body)}`,
    );
  }
  const body = login.body as { accessToken?: string; data?: { accessToken?: string } };
  const token = body.accessToken ?? body.data?.accessToken;
  if (!token) {
    throw new Error(`freshUser login returned no token: ${JSON.stringify(login.body)}`);
  }
  const refreshCookie = login.setCookie?.find?.((c) => c.startsWith('refresh_token=')) ?? undefined;

  return {
    userId,
    email,
    password,
    name,
    token,
    refreshCookie,
    bearer() {
      return { Authorization: `Bearer ${token}` };
    },
  };
}

/**
 * Build a fully-onboarded admin user. Same contract as `freshUser`
 * with `admin: true` — exposed as a separate name so call sites read
 * naturally (`freshAdmin(app)` vs `freshUser(app, { admin: true })`).
 */
export function freshAdmin(
  app: TestApp,
  opts: Omit<FreshUserOptions, 'admin'> = {},
): Promise<FreshUser> {
  return freshUser(app, { ...opts, admin: true });
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
