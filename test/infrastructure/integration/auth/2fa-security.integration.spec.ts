/**
 * 2FA Security Integration Tests
 *
 * These tests are designed to FIND BUGS, not confirm functionality.
 * Many of these tests are EXPECTED TO FAIL if vulnerabilities exist.
 *
 * BUG DISCOVERY TARGETS:
 * - Token reuse (replay attacks)
 * - Brute force vulnerabilities
 * - Time window exploitation
 * - Backup code security
 *
 * Order-independent: Bun 1.3+ runs tests inside a `describe`
 * out-of-declaration-order, so the prior shared `accessToken`/`userId`/
 * `totpSecret` (set in `beforeAll` / leaked between the two "Setup"
 * tests) would race — two parallel tests would overwrite each other's
 * 2FA secret + session. Each test now provisions its own fresh user
 * (unique email) and drives its own 2FA setup/enable so there's no
 * shared 2FA / session state. These tests exercise the REAL auth HTTP
 * flow (setup → verify → login → verify-2fa), so they keep real
 * signup/login via `createTestUserAndLogin`.
 */

import { describe, expect, it } from 'bun:test';
import * as speakeasy from 'speakeasy';
import {
  clearRateLimitState,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestId,
} from '../setup';

interface TfaActor {
  readonly userId: string;
  readonly accessToken: string;
  readonly email: string;
  readonly secret: string;
}

/**
 * Provision a fresh user, set up + enable 2FA, and return its
 * identity + TOTP secret + (optionally) backup codes. Each call is
 * fully independent — no shared 2FA/session state with sibling tests.
 */
async function freshUserWith2fa(
  emailPrefix: string,
): Promise<TfaActor & { backupCodes: string[] }> {
  const testUser = await createTestUserAndLogin({
    email: `${emailPrefix}-${uniqueTestId()}@example.com`,
  });

  const setupRes = await getRequest()
    .post('/api/v1/auth/2fa/setup')
    .set('Authorization', `Bearer ${testUser.accessToken}`);
  const secret = setupRes.body.secret;

  const enableToken = speakeasy.totp({ secret, encoding: 'base32' });
  const verifyRes = await getRequest()
    .post('/api/v1/auth/2fa/verify')
    .set('Authorization', `Bearer ${testUser.accessToken}`)
    .send({ code: enableToken });

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: testUser.userId } });

  return {
    userId: testUser.userId,
    accessToken: testUser.accessToken,
    email: user?.email ?? '',
    secret,
    backupCodes: (verifyRes.body?.backupCodes as string[]) ?? [],
  };
}

describe('2FA Security - Bug Discovery Tests', () => {
  describe('Setup 2FA', () => {
    it('should setup 2FA and return secret', async () => {
      await getApp();
      const testUser = await createTestUserAndLogin({
        email: `2fa-setup-${uniqueTestId()}@example.com`,
      });

      const response = await getRequest()
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(201);
      expect(response.body?.secret).toBeDefined();
      expect(response.body?.qrCode).toBeDefined();
    });

    it('should enable 2FA with valid token', async () => {
      await getApp();
      const testUser = await createTestUserAndLogin({
        email: `2fa-enable-${uniqueTestId()}@example.com`,
      });

      const setupRes = await getRequest()
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.accessToken}`);
      const secret = setupRes.body.secret;

      const token = speakeasy.totp({ secret, encoding: 'base32' });

      const response = await getRequest()
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ code: token });

      expect(response.status).toBe(201);
      expect(response.body?.enabled).toBe(true);
    });
  });

  describe('BUG-2FA-001: Token Reuse Vulnerability', () => {
    /**
     * EXPECTED BEHAVIOR: Same TOTP token should NOT work twice
     * ACTUAL BUG: Token can be reused within the time window (~150s)
     *
     * This is a REPLAY ATTACK vulnerability.
     */
    it('should REJECT same TOTP token used twice', async () => {
      await getApp();
      const testPassword = 'SecurePass123!';
      const testUser = await createTestUserAndLogin({
        email: `2fa-reuse-test-${uniqueTestId()}@example.com`,
        password: testPassword,
      });

      // Setup 2FA
      const setupRes = await getRequest()
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      const secret = setupRes.body.secret;

      // Enable 2FA
      const enableToken = speakeasy.totp({ secret, encoding: 'base32' });
      await getRequest()
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ code: enableToken });

      // Now test token reuse during LOGIN
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: testUser.userId } });

      // Step 1: Login with password (triggers 2FA challenge)
      const loginRes = await getRequest().post('/api/v1/auth/login').send({
        email: user?.email,
        password: testPassword,
      });

      expect(loginRes.body?.twoFactorRequired).toBe(true);

      // Generate a TOTP token
      const totpToken = speakeasy.totp({ secret, encoding: 'base32' });

      // Step 2: First use of token - should succeed (bypass rate limit for non-rate-limit tests)
      const firstUse = await getRequest()
        .post('/api/v1/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: testUser.userId,
          code: totpToken,
        });

      expect(firstUse.status).toBe(200);
      // verify-2fa response: Verify2faResponseSchema = { userId }
      expect(firstUse.body?.userId).toBeDefined();

      // Step 3: REUSE same token - THIS SHOULD FAIL but will pass if bug exists
      const secondUse = await getRequest()
        .post('/api/v1/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: testUser.userId,
          code: totpToken,
        });

      // If this test FAILS (status is 200), there's a REPLAY ATTACK vulnerability!
      expect(secondUse.status).toBe(401);
    });
  });

  describe('BUG-2FA-002: Brute Force Vulnerability', () => {
    /**
     * EXPECTED BEHAVIOR: After N failed attempts, should lock out
     * ACTUAL BUG: No rate limiting on 2FA validation
     */
    it(
      'should lock out after 5 failed 2FA attempts',
      async () => {
        await getApp();
        // Clear rate limit state from previous tests to ensure clean state
        await clearRateLimitState();

        const actor = await freshUserWith2fa('2fa-brute');

        // Login to trigger 2FA
        await getRequest().post('/api/v1/auth/login').send({
          email: actor.email,
          password: 'FreshPass123!',
        });

        // Try 10 wrong codes
        const results: number[] = [];
        for (let i = 0; i < 10; i++) {
          const response = await getRequest().post('/api/v1/auth/login/verify-2fa').send({
            userId: actor.userId,
            code: '000000', // Wrong code
          });
          results.push(response.status);
        }

        // If ALL requests return 401 (not 429 Too Many Requests), no rate limiting!
        const hasRateLimit = results.some((status) => status === 429);

        // This assertion should FAIL if there's no rate limiting
        expect(hasRateLimit).toBe(true);

        // Reset rate limits so we don't leak throttle state to siblings.
        await clearRateLimitState();
      },
      { timeout: 15000 },
    ); // 15 second timeout for this rate-limited test
  });

  describe('BUG-2FA-003: Backup Code Reuse', () => {
    /**
     * EXPECTED BEHAVIOR: Backup code can only be used once
     * Test verifies the fix is in place
     */
    it('should reject already-used backup code', async () => {
      await getApp();
      const actor = await freshUserWith2fa('2fa-backup');

      if (actor.backupCodes.length === 0) {
        console.log('No backup codes returned - skipping test');
        return;
      }

      // Use a backup code
      const backupCode = actor.backupCodes[0];

      // First login attempt
      await getRequest().post('/api/v1/auth/login').send({
        email: actor.email,
        password: 'FreshPass123!',
      });

      const firstUse = await getRequest()
        .post('/api/v1/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: actor.userId,
          code: backupCode,
        });

      // First use should work
      expect(firstUse.status).toBe(200);

      // Second login attempt with same backup code
      await getRequest().post('/api/v1/auth/login').send({
        email: actor.email,
        password: 'FreshPass123!',
      });

      const secondUse = await getRequest()
        .post('/api/v1/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: actor.userId,
          code: backupCode,
        });

      // Second use should FAIL
      expect(secondUse.status).toBe(401);
    });
  });

  describe('BUG-2FA-004: Time Window Exploitation', () => {
    /**
     * EXPECTED BEHAVIOR: Token should only be valid for ~30-60 seconds
     * ACTUAL CONCERN: window=2 means 150 seconds - too long!
     */
    it('should document the actual time window (informational)', async () => {
      await getApp();
      const testUser = await createTestUserAndLogin({
        email: `2fa-window-${uniqueTestId()}@example.com`,
      });

      // Setup 2FA
      const setupRes = await getRequest()
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      const secret = setupRes.body.secret;

      // Generate token for a time 60 seconds in the past
      const pastToken = speakeasy.totp({
        secret,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000) - 60, // 60 seconds ago
      });

      // This token shouldn't work with a tight window (window=0 or window=1)
      // But with window=2, it will work (covering 150 seconds)
      const isValidWithDefaultWindow = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: pastToken,
        window: 2, // Current default
      });

      const isValidWithTightWindow = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: pastToken,
        window: 1, // Recommended
      });

      console.log('60-second-old token valid with window=2:', isValidWithDefaultWindow);
      console.log('60-second-old token valid with window=1:', isValidWithTightWindow);

      // Document the security concern
      if (isValidWithDefaultWindow && !isValidWithTightWindow) {
        console.warn(
          'SECURITY CONCERN: Time window is too large. Consider reducing from window=2 to window=1',
        );
      }
    });
  });

  describe('BUG-2FA-005: 2FA Bypass via userId Manipulation', () => {
    /**
     * EXPECTED BEHAVIOR: userId should be validated against the login session
     * POTENTIAL BUG: Attacker might be able to use their own 2FA with victim's userId
     */
    it('should reject 2FA verification with mismatched userId', async () => {
      await getApp();
      // Create two users
      const victim = await createTestUserAndLogin({
        email: `2fa-victim-${uniqueTestId()}@example.com`,
      });

      // Setup + enable 2FA for attacker only
      const attacker = await freshUserWith2fa('2fa-attacker');

      // Try to use attacker's valid token with victim's userId
      const attackerToken = speakeasy.totp({ secret: attacker.secret, encoding: 'base32' });

      const response = await getRequest()
        .post('/api/v1/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: victim.userId, // Victim's ID
          code: attackerToken, // Attacker's valid token
        });

      // This should FAIL - can't use someone else's 2FA
      expect(response.status).toBe(401);
    });
  });
});
