/**
 * E2E Journey: Two-Factor Authentication
 *
 * Tests the complete 2FA lifecycle:
 * 1. Check 2FA status (disabled)
 * 2. Setup 2FA (get secret + QR)
 * 3. Verify with invalid code (fail)
 * 4. Verify and enable with valid TOTP code
 * 5. Check 2FA status (enabled)
 * 6. Logout and login again - should require 2FA
 * 7. Complete login with 2FA code
 * 8. Regenerate backup codes
 * 9. Disable 2FA
 * 10. Login now works without 2FA
 *
 * Target Time: < 30 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import speakeasy from 'speakeasy';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Two-Factor Authentication', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };
  let twoFactorSecret: string;
  let backupCodes: string[];

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;

    // Create and prepare a test user
    testUser = authHelper.createTestUser('2fa');
    const result = await authHelper.registerAndLogin(testUser);
    testUser.token = result.token;
    testUser.userId = result.userId;
  });

  afterAll(async () => {
    if (testUser?.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await stopTestApp();
  });

  describe('Step 1: Check initial 2FA status (disabled)', () => {
    it.serial('should report 2FA as disabled for new user', async () => {
      const response = await app.request
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
    });

    it.serial('should reject 2FA status check without authentication', async () => {
      const response = await app.request.get('/api/auth/2fa/status');

      expect(response.status).toBe(401);
    });
  });

  describe('Step 2: Setup 2FA', () => {
    it.serial('should generate secret and QR code', async () => {
      const response = await app.request
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.manualEntryKey).toBeDefined();

      // QR code should be a data URL
      expect(response.body.data.qrCode).toContain('data:image/png;base64,');

      // Save secret for later use
      twoFactorSecret = response.body.data.secret;
    });

    it.serial('should reject setup without authentication', async () => {
      const response = await app.request.post('/api/auth/2fa/setup');

      expect(response.status).toBe(401);
    });
  });

  describe('Step 3: Verify with invalid code (should fail)', () => {
    it.serial('should reject invalid TOTP code', async () => {
      const response = await app.request
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '000000' });

      expect(response.status).not.toBe(200);
    });

    it.serial('should reject empty code', async () => {
      const response = await app.request
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '' });

      expect(response.status).toBe(400);
    });

    it.serial('should reject code with wrong length', async () => {
      const response = await app.request
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '12345' });

      expect(response.status).toBe(400);
    });
  });

  describe('Step 4: Verify and enable with valid TOTP code', () => {
    it.serial('should enable 2FA with valid code and return backup codes', async () => {
      // Generate a valid TOTP code using the secret
      const validCode = speakeasy.totp({
        secret: twoFactorSecret,
        encoding: 'base32',
      });

      const response = await app.request
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: validCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.backupCodes).toBeDefined();
      expect(Array.isArray(response.body.data.backupCodes)).toBe(true);
      expect(response.body.data.backupCodes.length).toBeGreaterThan(0);

      // Backup codes should be in XXXX-XXXX format
      for (const code of response.body.data.backupCodes) {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      }

      backupCodes = response.body.data.backupCodes;
    });
  });

  describe('Step 5: Check 2FA status (should be enabled)', () => {
    it.serial('should report 2FA as enabled', async () => {
      const response = await app.request
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
    });
  });

  describe('Step 6: Login requires 2FA when enabled', () => {
    it.serial('should return twoFactorRequired on login', async () => {
      const response = await app.request.post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.twoFactorRequired).toBe(true);
      expect(response.body.data.userId).toBeDefined();

      // Should NOT return access token yet
      expect(response.body.data.accessToken).toBeUndefined();
    });

    it.serial('should reject 2FA verification with invalid code', async () => {
      // First login to get userId
      const loginResponse = await app.request.post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const userId = loginResponse.body.data.userId;

      const response = await app.request.post('/api/auth/login/verify-2fa').send({
        userId,
        code: '000000',
      });

      expect(response.status).toBe(401);
    });

    it.serial('should reject 2FA verification with missing userId', async () => {
      const response = await app.request.post('/api/auth/login/verify-2fa').send({
        code: '123456',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Step 7: Complete login with valid 2FA code', () => {
    it.serial(
      'should complete login with valid TOTP code',
      async () => {
        // Wait for a fresh TOTP window to avoid any replay issues with Step 4
        const secondsIntoWindow = Math.floor(Date.now() / 1000) % 30;
        if (secondsIntoWindow > 25) {
          await new Promise((resolve) => setTimeout(resolve, (31 - secondsIntoWindow) * 1000));
        }

        const loginResponse = await app.request.post('/api/auth/login').send({
          email: testUser.email,
          password: testUser.password,
        });

        const userId = loginResponse.body.data.userId;

        const validCode = speakeasy.totp({
          secret: twoFactorSecret,
          encoding: 'base32',
        });

        const response = await app.request.post('/api/auth/login/verify-2fa').send({
          userId,
          code: validCode,
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
        expect(response.body.data.userId).toBeDefined();

        testUser.token = response.body.data.accessToken;
      },
      15000,
    );
  });

  describe('Step 8: Regenerate backup codes', () => {
    it.serial('should regenerate backup codes', async () => {
      const response = await app.request
        .post('/api/auth/2fa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.backupCodes).toBeDefined();
      expect(Array.isArray(response.body.data.backupCodes)).toBe(true);
      expect(response.body.data.backupCodes.length).toBeGreaterThan(0);

      // New codes should differ from old codes
      const newCodes = response.body.data.backupCodes;
      const allSame = newCodes.every((code: string, i: number) => code === backupCodes[i]);
      expect(allSame).toBe(false);

      backupCodes = newCodes;
    });

    it.serial('should reject regeneration without authentication', async () => {
      const response = await app.request.post('/api/auth/2fa/backup-codes/regenerate');

      expect(response.status).toBe(401);
    });
  });

  describe('Step 9: Disable 2FA', () => {
    it.serial('should disable 2FA', async () => {
      const response = await app.request
        .delete('/api/auth/2fa')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(204);
    });

    it.serial('should report 2FA as disabled after removal', async () => {
      const response = await app.request
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(false);
    });

    it.serial('should reject disable without authentication', async () => {
      const response = await app.request.delete('/api/auth/2fa');

      expect(response.status).toBe(401);
    });
  });

  describe('Step 10: Login works without 2FA after disabling', () => {
    it.serial('should login directly without 2FA challenge', async () => {
      const response = await app.request.post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Should NOT require 2FA anymore
      expect(response.body.data.twoFactorRequired).toBeUndefined();
    });
  });

  describe('Security Edge Cases', () => {
    it.serial(
      'should not allow enabling 2FA with a replayed setup secret after disable',
      async () => {
        // The old secret should no longer be valid after re-setup
        // Setup fresh 2FA
        const setupResponse = await app.request
          .post('/api/auth/2fa/setup')
          .set('Authorization', `Bearer ${testUser.token}`);

        expect(setupResponse.status).toBe(200);
        const newSecret = setupResponse.body.data.secret;

        // Try verifying with the OLD secret's code
        const oldCode = speakeasy.totp({
          secret: twoFactorSecret,
          encoding: 'base32',
        });

        // If old and new secrets differ, the old code should fail
        if (newSecret !== twoFactorSecret) {
          const response = await app.request
            .post('/api/auth/2fa/verify')
            .set('Authorization', `Bearer ${testUser.token}`)
            .send({ code: oldCode });

          // Old secret's code is invalid against new secret → 401
          expect(response.status).toBe(401);
        }

        // Clean up: disable 2FA if it was enabled
        await app.request.delete('/api/auth/2fa').set('Authorization', `Bearer ${testUser.token}`);
      },
    );

    it.serial('should not expose sensitive info in 2FA status response', async () => {
      const response = await app.request
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);

      // Should NOT expose the TOTP secret
      const body = JSON.stringify(response.body);
      expect(body).not.toContain('secret');
      expect(body).not.toContain('otpauth');
    });
  });
});
