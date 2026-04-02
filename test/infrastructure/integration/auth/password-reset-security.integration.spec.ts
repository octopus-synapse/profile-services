/**
 * Password Reset Security Integration Tests
 *
 * These tests are designed to FIND BUGS, not confirm functionality.
 * Many of these tests are EXPECTED TO FAIL if vulnerabilities exist.
 *
 * BUG DISCOVERY TARGETS:
 * - Token reuse (race condition)
 * - Rate limiting on forgot-password
 * - Token enumeration vulnerability
 * - Concurrent reset requests
 * - Old token validity after new request
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { closeApp, createTestUserAndLogin, getApp, getPrisma, getRequest } from '../setup';

describe('Password Reset Security - Bug Discovery Tests', () => {
  let testUserId: string;
  let _testUserEmail: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin({
      email: `reset-test-${Date.now()}@example.com`,
    });
    testUserId = auth.userId;

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    if (!user?.email) {
      throw new Error('Test user not found or has no email');
    }
    _testUserEmail = user.email;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (testUserId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
      await prisma.resume.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await closeApp();
  });

  describe('BUG-PWD-001: Rate Limiting on Forgot Password', () => {
    /**
     * EXPECTED BEHAVIOR: After N requests, should return 429 Too Many Requests
     * ACTUAL BUG: No rate limiting allows email bombing / account lockout
     */
    it('should rate limit forgot-password requests - EXPECTED TO FAIL IF NO RATE LIMIT', async () => {
      const testUser = await createTestUserAndLogin({
        email: `rate-limit-test-${Date.now()}@example.com`,
      });

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: testUser.userId } });

      // Send 15 password reset requests rapidly
      const results: number[] = [];
      for (let i = 0; i < 15; i++) {
        const response = await getRequest().post('/api/auth/forgot-password').send({
          email: user?.email,
        });
        results.push(response.status);
      }

      // If ALL requests return 200/201 (not 429), no rate limiting!
      const hasRateLimit = results.some((status) => status === 429);

      // This assertion should FAIL if there's no rate limiting
      // No rate limit = email bombing vulnerability + potential account lockout
      expect(hasRateLimit).toBe(true);

      // Cleanup
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-PWD-002: Token Reuse Race Condition', () => {
    /**
     * EXPECTED BEHAVIOR: Token can only be used once
     * POTENTIAL BUG: Race condition allows token reuse before invalidation
     */
    it('should reject parallel token usage - EXPECTED TO FAIL IF RACE CONDITION EXISTS', async () => {
      const testUser = await createTestUserAndLogin({
        email: `token-race-${Date.now()}@example.com`,
      });

      const prisma = getPrisma();

      // Create a reset token directly in DB for testing
      const token = randomUUID();
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: testUser.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });

      // Send TWO parallel reset requests with the same token
      const [result1, result2] = await Promise.all([
        getRequest().post('/api/auth/reset-password').send({
          token,
          newPassword: 'NewPassword123!',
        }),
        getRequest().post('/api/auth/reset-password').send({
          token,
          newPassword: 'DifferentPassword456!',
        }),
      ]);

      // One should succeed (200), one should fail (400/401)
      const statuses = [result1.status, result2.status].sort();

      console.log('Parallel reset statuses:', statuses);

      // If BOTH succeeded, there's a race condition!
      const bothSucceeded = result1.status === 200 && result2.status === 200;

      // This should FAIL if race condition exists
      expect(bothSucceeded).toBe(false);

      // Cleanup
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-PWD-003: Old Token Still Valid After New Request', () => {
    /**
     * EXPECTED BEHAVIOR: Requesting new reset should invalidate old token
     * ACTUAL BUG: Multiple valid tokens can coexist
     */
    it('should invalidate old token when new one is requested - EXPECTED TO FAIL IF TOKENS ACCUMULATE', async () => {
      const testUser = await createTestUserAndLogin({
        email: `multi-token-${Date.now()}@example.com`,
      });

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: testUser.userId } });

      // Request first password reset (bypass rate limit for non-rate-limit tests)
      await getRequest()
        .post('/api/auth/forgot-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          email: user?.email,
        });

      // Get the first token
      const firstToken = await prisma.passwordResetToken.findFirst({
        where: { userId: testUser.userId },
        orderBy: { createdAt: 'desc' },
      });

      // Request second password reset (bypass rate limit)
      await getRequest()
        .post('/api/auth/forgot-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          email: user?.email,
        });

      // Count total valid tokens for this user
      const validTokens = await prisma.passwordResetToken.count({
        where: {
          userId: testUser.userId,
          expiresAt: { gt: new Date() },
        },
      });

      console.log('Valid tokens after 2 requests:', validTokens);

      // If more than 1 token exists, old tokens aren't invalidated
      // This could allow token harvesting attacks
      expect(validTokens).toBe(1);

      // Try to use the old token (if it still exists)
      if (firstToken) {
        const oldTokenResponse = await getRequest().post('/api/auth/reset-password').send({
          token: firstToken.token,
          newPassword: 'TestPassword123!',
        });

        // Old token should be rejected
        expect(oldTokenResponse.status).toBe(400);
      }

      // Cleanup
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-PWD-004: Token Enumeration via Timing', () => {
    /**
     * EXPECTED BEHAVIOR: Response time should be consistent (constant-time comparison)
     * ACTUAL BUG: Different response times reveal token existence
     */
    it('should have consistent response times - INFORMATIONAL', async () => {
      const _validToken = randomUUID();
      const invalidToken = randomUUID();

      // Time multiple requests with invalid token
      const invalidTimes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await getRequest().post('/api/auth/reset-password').send({
          token: invalidToken,
          newPassword: 'TestPassword123!',
        });
        invalidTimes.push(performance.now() - start);
      }

      // Time multiple requests with malformed token
      const malformedTimes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await getRequest().post('/api/auth/reset-password').send({
          token: 'short',
          newPassword: 'TestPassword123!',
        });
        malformedTimes.push(performance.now() - start);
      }

      const avgInvalidTime = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;
      const avgMalformedTime = malformedTimes.reduce((a, b) => a + b) / malformedTimes.length;

      console.log('Average time for invalid token:', avgInvalidTime.toFixed(2), 'ms');
      console.log('Average time for malformed token:', avgMalformedTime.toFixed(2), 'ms');

      // If there's > 50ms difference, there may be timing vulnerability
      const timeDiff = Math.abs(avgInvalidTime - avgMalformedTime);
      if (timeDiff > 50) {
        console.warn(
          'SECURITY CONCERN: Significant timing difference detected (',
          timeDiff.toFixed(2),
          'ms)',
        );
        console.warn('This could allow token enumeration via timing attacks');
      }
    });
  });

  describe('BUG-PWD-005: Expired Token Handling', () => {
    /**
     * EXPECTED BEHAVIOR: Expired token returns clear error
     * Verify the 24-hour expiration is enforced
     */
    it('should reject expired token with clear error message', async () => {
      const testUser = await createTestUserAndLogin({
        email: `expired-token-${Date.now()}@example.com`,
      });

      const prisma = getPrisma();

      // Create an expired token (25 hours in the past)
      const expiredToken = randomUUID();
      await prisma.passwordResetToken.create({
        data: {
          token: expiredToken,
          userId: testUser.userId,
          expiresAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago (expired)
        },
      });

      // Try to use expired token
      const response = await getRequest().post('/api/auth/reset-password').send({
        token: expiredToken,
        newPassword: 'NewPassword123!',
      });

      // Should be rejected
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-PWD-006: Password Reset for Non-Existent User', () => {
    /**
     * EXPECTED BEHAVIOR: Should return same response as existing user (prevent enumeration)
     * ACTUAL BUG: Different response reveals user existence
     */
    it('should return same response for existing and non-existing users - EXPECTED TO FAIL IF ENUMERATION POSSIBLE', async () => {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: testUserId } });

      // Request for existing user (bypass rate limit)
      const existingUserResponse = await getRequest()
        .post('/api/auth/forgot-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          email: user?.email,
        });

      // Request for non-existing user (bypass rate limit)
      const nonExistingUserResponse = await getRequest()
        .post('/api/auth/forgot-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          email: `nonexistent-user-${Date.now()}@example.com`,
        });

      console.log(
        'Existing user response:',
        existingUserResponse.status,
        existingUserResponse.body,
      );
      console.log(
        'Non-existing user response:',
        nonExistingUserResponse.status,
        nonExistingUserResponse.body,
      );

      // Both should return the same status code (prevent user enumeration)
      expect(existingUserResponse.status).toBe(nonExistingUserResponse.status);

      // Both should return similar response structure (no hints about existence)
      // The response should be generic like "If an account exists, an email will be sent"
    });
  });

  describe('BUG-PWD-007: Weak Password Accepted', () => {
    /**
     * EXPECTED BEHAVIOR: Weak passwords should be rejected
     * Test various weak password patterns
     */
    it('should reject weak passwords during reset', async () => {
      const testUser = await createTestUserAndLogin({
        email: `weak-pwd-${Date.now()}@example.com`,
      });

      const prisma = getPrisma();

      // Create a valid token
      const token = randomUUID();
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: testUser.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Test weak passwords
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123',
        '12345678',
        'password123',
        (user) => user.email.split('@')[0], // Username as password
      ];

      const results: { password: string; accepted: boolean }[] = [];

      for (const weakPwd of weakPasswords) {
        // Create new token for each test (old one gets invalidated)
        const newToken = randomUUID();
        await prisma.passwordResetToken.create({
          data: {
            token: newToken,
            userId: testUser.userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        const pwd =
          typeof weakPwd === 'function'
            ? weakPwd({ email: `weak-pwd-${Date.now()}@example.com` })
            : weakPwd;

        const response = await getRequest().post('/api/auth/reset-password').send({
          token: newToken,
          newPassword: pwd,
        });

        results.push({
          password: pwd,
          accepted: response.status === 200,
        });
      }

      console.log('Weak password test results:');
      for (const r of results) {
        console.log(`  "${r.password}": ${r.accepted ? 'ACCEPTED (BUG!)' : 'REJECTED (good)'}`);
      }

      // All weak passwords should be rejected
      const acceptedWeak = results.filter((r) => r.accepted);
      expect(acceptedWeak.length).toBe(0);

      // Cleanup
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });

  describe('BUG-PWD-008: Session Invalidation After Password Reset', () => {
    /**
     * EXPECTED BEHAVIOR: All active sessions should be invalidated after password reset
     * ACTUAL BUG: Old sessions remain valid
     */
    it('should invalidate all sessions after password reset - EXPECTED TO FAIL IF SESSIONS PERSIST', async () => {
      const testUser = await createTestUserAndLogin({
        email: `session-invalidation-${Date.now()}@example.com`,
      });

      const prisma = getPrisma();

      // Get the current access token (from login)
      const oldAccessToken = testUser.accessToken;

      // Verify old token works
      const beforeReset = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${oldAccessToken}`);

      expect(beforeReset.status).toBe(200);

      // Create a reset token and reset password
      const token = randomUUID();
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: testUser.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const resetResponse = await getRequest().post('/api/auth/reset-password').send({
        token,
        newPassword: 'CompletelyNewPassword123!',
      });

      expect(resetResponse.status).toBe(200);

      // Delay to ensure event handlers complete and Redis operations finish
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Try to use OLD access token - should be invalidated!
      const afterReset = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${oldAccessToken}`);

      console.log('Old token status after password reset:', afterReset.status);

      // If old token still works (200), sessions aren't being invalidated!
      // This is a security issue - stolen token remains valid
      expect(afterReset.status).toBe(401);

      // Cleanup
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.resume.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.deleteMany({ where: { id: testUser.userId } });
    });
  });
});
