/**
 * E2E Test Auth Helper (Elysia harness).
 *
 * Replaces the legacy supertest + INestApplication helper with the
 * `TestApp` shape. Method surface kept identical so migrated journey
 * suites need no changes.
 */

import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { type TestApp } from '../../shared';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  token?: string;
  userId?: string;
}

export class AuthHelper {
  constructor(
    private readonly app: TestApp,
    private readonly prisma?: PrismaClient,
  ) {}

  createTestUser(suffix?: string): TestUser {
    const uuid = randomUUID().slice(0, 8);
    const uniqueSuffix = suffix ? `${suffix}-${uuid}` : uuid;
    return {
      email: `e2e-${uniqueSuffix}@example.com`,
      password: 'TestPassword123!',
      name: `E2E Test User ${uniqueSuffix}`,
    };
  }

  /**
   * Register and log in a test user.
   *
   * Default behavior (no opts): the helper flips both `emailVerified`
   * and `hasCompletedOnboarding` directly in the DB so the gates don't
   * block downstream calls. Specs that exercise the gates themselves
   * (three-stage-gating, onboarding journeys, email-verification) pass
   * `{ skipEmailVerify: true, skipOnboarding: true }` to keep the
   * gate state authentic.
   */
  async registerAndLogin(
    user?: TestUser,
    opts: { skipEmailVerify?: boolean; skipOnboarding?: boolean } = {},
  ): Promise<TestUser> {
    const testUser = user || this.createTestUser();

    const signup = await this.app.request.post('/api/accounts').send({
      email: testUser.email,
      password: testUser.password,
      name: testUser.name,
      acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
      acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
    });
    if (signup.status !== 201 && signup.status !== 200) {
      throw new Error(
        `Signup failed: ${signup.status} - ${typeof signup.body === 'string' ? signup.body : JSON.stringify(signup.body)}`,
      );
    }
    const data =
      (signup.body as { data?: { userId: string } }).data ?? (signup.body as { userId: string });
    testUser.userId = data.userId;

    if (this.prisma && testUser.userId) {
      const update: Record<string, unknown> = {};
      if (!opts.skipEmailVerify) update.emailVerified = new Date();
      if (!opts.skipOnboarding) {
        update.hasCompletedOnboarding = true;
        update.onboardingCompletedAt = new Date();
      }
      if (Object.keys(update).length > 0) {
        await this.prisma.user.update({ where: { id: testUser.userId }, data: update });
      }

      // Assign the seeded `user` role so the permission gate finds
      // resume:create / read / update / etc. for this account. The
      // /api/accounts endpoint only sets the legacy `User.roles` array
      // column; the authorization model uses UserRoleAssignment rows.
      const userRole = await this.prisma.role.findUnique({ where: { name: 'user' } });
      if (userRole) {
        await this.prisma.userRoleAssignment.upsert({
          where: { userId_roleId: { userId: testUser.userId, roleId: userRole.id } },
          create: { userId: testUser.userId, roleId: userRole.id },
          update: {},
        });
      }

      // UserConsent rows are created by /api/accounts when the request
      // body carries `acceptedTosVersion` + `acceptedPrivacyVersion`
      // (which we send above). Re-inserting here would collide on the
      // (userId, documentType, version) unique key.
    }

    testUser.token = await this.login(testUser.email, testUser.password);
    return testUser;
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
}
