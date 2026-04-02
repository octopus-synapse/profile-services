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
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as speakeasy from 'speakeasy';
import { closeApp, createTestUserAndLogin, getApp, getPrisma, getRequest } from '../setup';

describe('2FA Security - Bug Discovery Tests', () => {
  let accessToken: string;
  let userId: string;
  let totpSecret: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin();
    accessToken = auth.accessToken;
    userId = auth.userId;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (userId) {
      await prisma.twoFactorAuth.deleteMany({ where: { userId } });
      await prisma.twoFactorBackupCode.deleteMany({ where: { userId } });
      await prisma.resume.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await closeApp();
  });

  describe('Setup 2FA', () => {
    it('should setup 2FA and return secret', async () => {
      const response = await getRequest()
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data?.secret).toBeDefined();
      expect(response.body.data?.qrCode).toBeDefined();

      totpSecret = response.body.data.secret;
    });

    it('should enable 2FA with valid token', async () => {
      const token = speakeasy.totp({
        secret: totpSecret,
        encoding: 'base32',
      });

      const response = await getRequest()
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: token });

      expect(response.status).toBe(200);
      expect(response.body.data?.enabled).toBe(true);
    });
  });

  describe('BUG-2FA-001: Token Reuse Vulnerability', () => {
    /**
     * EXPECTED BEHAVIOR: Same TOTP token should NOT work twice
     * ACTUAL BUG: Token can be reused within the time window (~150s)
     *
     * This is a REPLAY ATTACK vulnerability.
     */
    it('should REJECT same TOTP token used twice - EXPECTED TO FAIL IF BUG EXISTS', async () => {
      // Get fresh credentials for isolated test
      const testUser = await createTestUserAndLogin({
        email: `2fa-reuse-test-${Date.now()}@example.com`,
      });

      // Setup 2FA
      const setupRes = await getRequest()
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      const secret = setupRes.body.data.secret;

      // Enable 2FA
      const enableToken = speakeasy.totp({ secret, encoding: 'base32' });
      await getRequest()
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ code: enableToken });

      // Now test token reuse during LOGIN
      // First, get user email for login
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: testUser.userId } });

      // Step 1: Login with password (triggers 2FA challenge)
      const loginRes = await getRequest().post('/api/auth/login').send({
        email: user?.email,
        password: 'SecurePass123!',
      });

      expect(loginRes.body.data?.twoFactorRequired).toBe(true);

      // Generate a TOTP token
      const totpToken = speakeasy.totp({ secret, encoding: 'base32' });

      // Step 2: First use of token - should succeed (bypass rate limit for non-rate-limit tests)
      const firstUse = await getRequest()
        .post('/api/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: testUser.userId,
          code: totpToken,
        });

      expect(firstUse.status).toBe(200);
      expect(firstUse.body.data?.accessToken).toBeDefined();

      // Step 3: REUSE same token - THIS SHOULD FAIL but will pass if bug exists
      const secondUse = await getRequest()
        .post('/api/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: testUser.userId,
          code: totpToken,
        });

      // If this test FAILS (status is 200), there's a REPLAY ATTACK vulnerability!
      expect(secondUse.status).toBe(401);
      expect(secondUse.body.success).toBe(false);

      // Cleanup
      await prisma.twoFactorAuth.deleteMany({ where: { userId: testUser.userId } });
      await prisma.twoFactorBackupCode.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-2FA-002: Brute Force Vulnerability', () => {
    /**
     * EXPECTED BEHAVIOR: After N failed attempts, should lock out
     * ACTUAL BUG: No rate limiting on 2FA validation
     */
    it('should lock out after 5 failed 2FA attempts - EXPECTED TO FAIL IF NO RATE LIMIT', async () => {
      // Get fresh credentials
      const testUser = await createTestUserAndLogin({
        email: `2fa-brute-${Date.now()}@example.com`,
      });

      // Setup and enable 2FA
      const setupRes = await getRequest()
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      const secret = setupRes.body.data.secret;
      const enableToken = speakeasy.totp({ secret, encoding: 'base32' });

      await getRequest()
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ code: enableToken });

      // Login to trigger 2FA
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: testUser.userId } });

      await getRequest().post('/api/auth/login').send({
        email: user?.email,
        password: 'SecurePass123!',
      });

      // Try 10 wrong codes
      const results: number[] = [];
      for (let i = 0; i < 10; i++) {
        const response = await getRequest().post('/api/auth/login/verify-2fa').send({
          userId: testUser.userId,
          code: '000000', // Wrong code
        });
        results.push(response.status);
      }

      // If ALL requests return 401 (not 429 Too Many Requests), no rate limiting!
      const hasRateLimit = results.some((status) => status === 429);

      // This assertion should FAIL if there's no rate limiting
      expect(hasRateLimit).toBe(true);

      // Cleanup
      await prisma.twoFactorAuth.deleteMany({ where: { userId: testUser.userId } });
      await prisma.twoFactorBackupCode.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-2FA-003: Backup Code Reuse', () => {
    /**
     * EXPECTED BEHAVIOR: Backup code can only be used once
     * Test verifies the fix is in place
     */
    it('should reject already-used backup code', async () => {
      const testUser = await createTestUserAndLogin({
        email: `2fa-backup-${Date.now()}@example.com`,
      });

      // Setup and enable 2FA
      const setupRes = await getRequest()
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      const secret = setupRes.body.data.secret;
      const backupCodes: string[] = setupRes.body.data.backupCodes || [];

      // Enable 2FA
      const enableToken = speakeasy.totp({ secret, encoding: 'base32' });
      await getRequest()
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ code: enableToken });

      if (backupCodes.length === 0) {
        console.log('No backup codes returned - skipping test');
        return;
      }

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: testUser.userId } });

      // Use a backup code
      const backupCode = backupCodes[0];

      // First login attempt
      await getRequest().post('/api/auth/login').send({
        email: user?.email,
        password: 'SecurePass123!',
      });

      const firstUse = await getRequest()
        .post('/api/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: testUser.userId,
          code: backupCode,
        });

      // First use should work
      expect(firstUse.status).toBe(200);

      // Second login attempt with same backup code
      await getRequest().post('/api/auth/login').send({
        email: user?.email,
        password: 'SecurePass123!',
      });

      const secondUse = await getRequest()
        .post('/api/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: testUser.userId,
          code: backupCode,
        });

      // Second use should FAIL
      expect(secondUse.status).toBe(401);

      // Cleanup
      await prisma.twoFactorAuth.deleteMany({ where: { userId: testUser.userId } });
      await prisma.twoFactorBackupCode.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-2FA-004: Time Window Exploitation', () => {
    /**
     * EXPECTED BEHAVIOR: Token should only be valid for ~30-60 seconds
     * ACTUAL CONCERN: window=2 means 150 seconds - too long!
     */
    it('should document the actual time window (informational)', async () => {
      const testUser = await createTestUserAndLogin({
        email: `2fa-window-${Date.now()}@example.com`,
      });

      // Setup 2FA
      const setupRes = await getRequest()
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      const secret = setupRes.body.data.secret;

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

      // Cleanup
      const prisma = getPrisma();
      await prisma.twoFactorAuth.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-2FA-005: 2FA Bypass via userId Manipulation', () => {
    /**
     * EXPECTED BEHAVIOR: userId should be validated against the login session
     * POTENTIAL BUG: Attacker might be able to use their own 2FA with victim's userId
     */
    it('should reject 2FA verification with mismatched userId', async () => {
      // Create two users
      const victim = await createTestUserAndLogin({
        email: `2fa-victim-${Date.now()}@example.com`,
      });

      const attacker = await createTestUserAndLogin({
        email: `2fa-attacker-${Date.now()}@example.com`,
      });

      // Setup 2FA for attacker only
      const attackerSetup = await getRequest()
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${attacker.accessToken}`);

      const attackerSecret = attackerSetup.body.data.secret;

      // Enable attacker's 2FA
      const enableToken = speakeasy.totp({ secret: attackerSecret, encoding: 'base32' });
      await getRequest()
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${attacker.accessToken}`)
        .send({ code: enableToken });

      // Try to use attacker's valid token with victim's userId
      const attackerToken = speakeasy.totp({ secret: attackerSecret, encoding: 'base32' });

      const response = await getRequest()
        .post('/api/auth/login/verify-2fa')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          userId: victim.userId, // Victim's ID
          code: attackerToken, // Attacker's valid token
        });

      // This should FAIL - can't use someone else's 2FA
      expect(response.status).toBe(401);

      // Cleanup
      const prisma = getPrisma();
      await prisma.twoFactorAuth.deleteMany({
        where: { userId: { in: [victim.userId, attacker.userId] } },
      });
      await prisma.twoFactorBackupCode.deleteMany({
        where: { userId: { in: [victim.userId, attacker.userId] } },
      });
      await prisma.user.deleteMany({ where: { id: { in: [victim.userId, attacker.userId] } } });
    });
  });
});
