/**
 * Unified auth helper for the Elysia test harness.
 *
 * Single source of truth — replaces the legacy
 * `test/infrastructure/e2e/helpers/auth.helper.ts` per Q56 in the
 * duplication audit. Both integration and e2e suites use this.
 *
 * Surface:
 *   - createTestUser(suffix?)        → TestUser
 *   - registerAndLogin(user?, opts?) → TestUser with token + cookie
 *   - login(email, password)         → access token
 *   - refreshToken(token)            → fresh access token
 *   - getCurrentUser(token)          → /users/profile body
 *   - acceptToS(token)               → ToS + Privacy consent rows
 *   - requestEmailVerification(token)
 *   - logout(user)
 *   - bearer(user)                   → { Authorization: 'Bearer …' }
 *
 * `registerAndLogin` defaults to a fully-onboarded, email-verified user
 * with the `user` role — saves every spec from rebuilding the gates by
 * hand. Specs that exercise the gates themselves
 * (three-stage-gating, onboarding journeys, email-verification) opt out
 * via `{ skipEmailVerify: true, skipOnboarding: true }`.
 */

import { randomUUID } from 'node:crypto';
import type { TestApp } from './test-app';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  token?: string;
  refreshCookie?: string;
  userId?: string;
}

export interface RegisterAndLoginOptions {
  /** Skip the DB write that flips `emailVerified`. */
  skipEmailVerify?: boolean;
  /** Skip the DB write that flips `onboardingCompletedAt` + assigns `user` role. */
  skipOnboarding?: boolean;
}

export class AuthHelper {
  constructor(private readonly app: TestApp) {}

  createTestUser(suffix?: string): TestUser {
    const uuid = randomUUID().slice(0, 8);
    const uniqueSuffix = suffix ? `${suffix}-${uuid}` : uuid;
    return {
      email: `e2e-${uniqueSuffix}@example.com`,
      password: 'TestPassword123!',
      name: `E2E Test User ${uniqueSuffix}`,
    };
  }

  async registerAndLogin(
    user?: TestUser,
    opts: RegisterAndLoginOptions = {},
  ): Promise<TestUser> {
    const u = user ?? this.createTestUser();

    const signup = await this.app.request.post('/api/accounts').send({
      email: u.email,
      password: u.password,
      name: u.name,
      acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
      acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
    });
    if (signup.status >= 400) {
      throw new Error(
        `signup failed: ${signup.status} ${typeof signup.body === 'string' ? signup.body : JSON.stringify(signup.body)}`,
      );
    }

    const userRow = await this.app.prisma.user.findUnique({ where: { email: u.email } });
    if (!userRow) throw new Error('user row missing after signup');
    u.userId = userRow.id;

    // Per-spec gate control. By default both gates are bypassed so the
    // signup → access-protected-route happy path works in two requests.
    const update: Record<string, unknown> = {};
    if (!opts.skipEmailVerify) update.emailVerified = new Date();
    if (!opts.skipOnboarding) update.onboardingCompletedAt = new Date();
    if (Object.keys(update).length > 0) {
      await this.app.prisma.user.update({ where: { id: userRow.id }, data: update });
    }

    if (!opts.skipOnboarding) {
      // Mirror what the production onboarding-completion adapter does:
      // assign the `user` role so the permission pipeline lets domain
      // routes through. Without this the user has zero domain perms
      // and every gated route returns 403.
      const userRole = await this.app.prisma.role.findUnique({ where: { name: 'user' } });
      if (userRole) {
        await this.app.prisma.userRoleAssignment.upsert({
          where: { userId_roleId: { userId: userRow.id, roleId: userRole.id } },
          create: {
            userId: userRow.id,
            roleId: userRole.id,
            assignedBy: 'integration-test-helper',
          },
          update: {},
        });
      }
    }

    const login = await this.app.request
      .post('/api/auth/login')
      .send({ email: u.email, password: u.password });
    if (login.status >= 400) {
      throw new Error(
        `login failed: ${login.status} ${typeof login.body === 'string' ? login.body : JSON.stringify(login.body)}`,
      );
    }
    const body = login.body as { accessToken?: string; data?: { accessToken?: string } };
    u.token = body.accessToken ?? body.data?.accessToken;
    u.refreshCookie = login.setCookie.find((c) => c.startsWith('refresh_token=')) ?? undefined;
    return u;
  }

  async login(email: string, password: string): Promise<string> {
    const res = await this.app.request.post('/api/auth/login').send({ email, password });
    if (res.status !== 200) {
      throw new Error(
        `Login failed: ${res.status} - ${typeof res.body === 'string' ? res.body : JSON.stringify(res.body)}`,
      );
    }
    const body = res.body as {
      accessToken?: string;
      token?: string;
      data?: { accessToken?: string; token?: string };
    };
    const token = body.accessToken ?? body.token ?? body.data?.accessToken ?? body.data?.token;
    if (!token) throw new Error('Login response missing access token');
    return token;
  }

  async refreshToken(token: string): Promise<string> {
    const res = await this.app.request
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${token}`);
    if (res.status !== 200) throw new Error('Token refresh failed');
    return (res.body as { token: string }).token;
  }

  async getCurrentUser(token: string): Promise<unknown> {
    const res = await this.app.request
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    return res.body;
  }

  async acceptToS(token: string): Promise<void> {
    const tosRes = await this.app.request
      .post('/api/v1/users/me/accept-consent')
      .set('Authorization', `Bearer ${token}`)
      .send({ documentType: 'TERMS_OF_SERVICE' });
    if (tosRes.status !== 201) {
      throw new Error(`ToS acceptance failed: ${tosRes.status} - ${JSON.stringify(tosRes.body)}`);
    }
    const ppRes = await this.app.request
      .post('/api/v1/users/me/accept-consent')
      .set('Authorization', `Bearer ${token}`)
      .send({ documentType: 'PRIVACY_POLICY' });
    if (ppRes.status !== 201) {
      throw new Error(
        `Privacy policy acceptance failed: ${ppRes.status} - ${JSON.stringify(ppRes.body)}`,
      );
    }
  }

  async requestEmailVerification(token: string): Promise<void> {
    await this.app.request
      .post('/api/email-verification/send')
      .set('Authorization', `Bearer ${token}`);
  }

  /** Returns the `Authorization: Bearer <token>` header tuple. */
  bearer(user: TestUser): { Authorization: string } {
    if (!user.token) throw new Error('user has no token; call registerAndLogin first');
    return { Authorization: `Bearer ${user.token}` };
  }

  async logout(user: TestUser): Promise<void> {
    if (!user.token) return;
    await this.app.request.post('/api/v1/auth/logout').set(this.bearer(user));
  }
}
