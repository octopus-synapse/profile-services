/**
 * Shared auth helper for the Elysia test harness.
 *
 * Replaces the legacy `test/infrastructure/e2e/helpers/auth.helper.ts`
 * which depended on `INestApplication` + `supertest`. The new version
 * takes a `TestApp` (boot via `startTestApp`) and uses `app.request` —
 * the supertest-shaped fetch wrapper.
 *
 * Surface kept stable for the migration:
 *   - createTestUser(suffix?) → TestUser
 *   - registerAndLogin(user?) → TestUser with token + cookie
 *   - logout(user)
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

  /** Register, verify email, accept ToS, and return ready-to-use token. */
  async registerAndLogin(user?: TestUser): Promise<TestUser> {
    const u = user ?? this.createTestUser();

    const signup = await this.app.request
      .post('/api/v1/auth/signup')
      .send({ email: u.email, password: u.password, name: u.name });
    if (signup.status >= 400) {
      throw new Error(
        `signup failed: ${signup.status} ${typeof signup.body === 'string' ? signup.body : JSON.stringify(signup.body)}`,
      );
    }

    // Drive the verify-email + tos-accept flows via direct DB writes —
    // they're test-only fixtures, not the surface under test. The
    // legacy helper did the same.
    const userRow = await this.app.prisma.user.findUnique({ where: { email: u.email } });
    if (!userRow) throw new Error('user row missing after signup');
    u.userId = userRow.id;
    // Mark the user verified directly. ToS acceptance lives on
    // `UserConsent` rows in the new schema — port that write when a
    // suite needs the consent guard to pass.
    await this.app.prisma.user.update({
      where: { id: userRow.id },
      data: { emailVerified: new Date() },
    });

    const login = await this.app.request
      .post('/api/v1/auth/login')
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
