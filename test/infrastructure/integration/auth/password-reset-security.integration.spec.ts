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
 *
 * Order-independent: Bun 1.3+ runs tests inside a `describe`
 * out-of-declaration-order and runs spec files concurrently. The prior
 * version shared `testUserId`/`testUserEmail` (set in `beforeEach`,
 * read by BUG-PWD-006) and an `afterAll` cleanup. Each test now
 * provisions its OWN user via `freshInDbUser` (unique email + token)
 * and clears the IP-keyed reset/forgot buckets before running — a 429
 * from bucket bleed across a concurrent run is a setup artifact, not a
 * product bug.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { freshInDbUser } from '../../shared';
import { clearAuthRateLimits, getApp } from '../setup';

describe('Password Reset Security - Bug Discovery Tests', () => {
  beforeEach(async () => {
    await clearAuthRateLimits();
  });

  describe('BUG-PWD-001: Rate Limiting on Forgot Password', () => {
    /**
     * EXPECTED BEHAVIOR: After N requests, should return 429 Too Many Requests
     * ACTUAL BUG: No rate limiting allows email bombing / account lockout
     */
    it('should rate limit forgot-password requests', async () => {
      const app = await getApp();
      const testUser = await freshInDbUser(app);

      // Send 15 password reset requests rapidly
      const results: number[] = [];
      for (let i = 0; i < 15; i++) {
        const response = await app.request.post('/api/v1/auth/forgot-password').send({
          email: testUser.email,
        });
        results.push(response.status);
      }

      // If ALL requests return 200/201 (not 429), no rate limiting!
      const hasRateLimit = results.some((status) => status === 429);

      // This assertion should FAIL if there's no rate limiting
      // No rate limit = email bombing vulnerability + potential account lockout
      expect(hasRateLimit).toBe(true);
    });
  });

  describe('BUG-PWD-002: Token Reuse Race Condition', () => {
    /**
     * EXPECTED BEHAVIOR: Token can only be used once
     * POTENTIAL BUG: Race condition allows token reuse before invalidation
     */
    it('should reject parallel token usage - EXPECTED TO FAIL IF RACE CONDITION EXISTS', async () => {
      const app = await getApp();
      const testUser = await freshInDbUser(app);

      // Create a reset token directly in DB for testing
      const token = randomUUID();
      await app.prisma.passwordResetToken.create({
        data: {
          token,
          userId: testUser.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });

      // Send TWO parallel reset requests with the same token
      const [result1, result2] = await Promise.all([
        app.request
          .post('/api/v1/auth/reset-password')
          .set('x-e2e-bypass-rate-limit', 'true')
          .send({
            token,
            newPassword: 'NewPassword123!',
          }),
        app.request
          .post('/api/v1/auth/reset-password')
          .set('x-e2e-bypass-rate-limit', 'true')
          .send({
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
    });
  });

  describe('BUG-PWD-003: Old Token Still Valid After New Request', () => {
    /**
     * EXPECTED BEHAVIOR: Requesting new reset should invalidate old token
     * ACTUAL BUG: Multiple valid tokens can coexist
     */
    it('should invalidate old token when new one is requested - EXPECTED TO FAIL IF TOKENS ACCUMULATE', async () => {
      const app = await getApp();
      const testUser = await freshInDbUser(app);

      // Request first password reset (bypass rate limit for non-rate-limit tests)
      await app.request
        .post('/api/v1/auth/forgot-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          email: testUser.email,
        });

      // Get the first token
      const firstToken = await app.prisma.passwordResetToken.findFirst({
        where: { userId: testUser.userId },
        orderBy: { createdAt: 'desc' },
      });

      // Request second password reset (bypass rate limit)
      await app.request
        .post('/api/v1/auth/forgot-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          email: testUser.email,
        });

      // Count total valid tokens for this user
      const validTokens = await app.prisma.passwordResetToken.count({
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
        const oldTokenResponse = await app.request
          .post('/api/v1/auth/reset-password')
          .set('x-e2e-bypass-rate-limit', 'true')
          .send({
            token: firstToken.token,
            newPassword: 'TestPassword123!',
          });

        // Old token should be rejected
        expect(oldTokenResponse.status).toBe(400);
      }
    });
  });

  describe('BUG-PWD-004: Token Enumeration via Timing', () => {
    /**
     * EXPECTED BEHAVIOR: Response time should be consistent (constant-time comparison)
     * ACTUAL BUG: Different response times reveal token existence
     */
    it('should have consistent response times - INFORMATIONAL', async () => {
      const app = await getApp();
      const _validToken = randomUUID();
      const invalidToken = randomUUID();

      // Time multiple requests with invalid token
      const invalidTimes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await app.request
          .post('/api/v1/auth/reset-password')
          .set('x-e2e-bypass-rate-limit', 'true')
          .send({
            token: invalidToken,
            newPassword: 'TestPassword123!',
          });
        invalidTimes.push(performance.now() - start);
      }

      // Time multiple requests with malformed token
      const malformedTimes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await app.request
          .post('/api/v1/auth/reset-password')
          .set('x-e2e-bypass-rate-limit', 'true')
          .send({
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
      const app = await getApp();
      const testUser = await freshInDbUser(app);

      // Create an expired token (25 hours in the past)
      const expiredToken = randomUUID();
      await app.prisma.passwordResetToken.create({
        data: {
          token: expiredToken,
          userId: testUser.userId,
          expiresAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago (expired)
        },
      });

      // Try to use expired token
      const response = await app.request
        .post('/api/v1/auth/reset-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          token: expiredToken,
          newPassword: 'NewPassword123!',
        });

      // Should be rejected
      expect(response.status).toBe(400);
    });
  });

  describe('BUG-PWD-006: Password Reset for Non-Existent User', () => {
    /**
     * EXPECTED BEHAVIOR: Should return same response as existing user (prevent enumeration)
     * ACTUAL BUG: Different response reveals user existence
     */
    it('should return same response for existing and non-existing users - EXPECTED TO FAIL IF ENUMERATION POSSIBLE', async () => {
      const app = await getApp();
      const testUser = await freshInDbUser(app);

      // Request for existing user (bypass rate limit)
      const existingUserResponse = await app.request
        .post('/api/v1/auth/forgot-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          email: testUser.email,
        });

      // Request for non-existing user (bypass rate limit)
      const nonExistingUserResponse = await app.request
        .post('/api/v1/auth/forgot-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          email: `nonexistent-user-${randomUUID()}@example.com`,
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
      const app = await getApp();
      const testUser = await freshInDbUser(app);

      // Test weak passwords
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123',
        '12345678',
        'password123',
        (user: { email: string }) => user.email.split('@')[0], // Username as password
      ];

      const results: { password: string; accepted: boolean }[] = [];

      for (const weakPwd of weakPasswords) {
        // Create new token for each test (old one gets invalidated)
        const newToken = randomUUID();
        await app.prisma.passwordResetToken.create({
          data: {
            token: newToken,
            userId: testUser.userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        const pwd = typeof weakPwd === 'function' ? weakPwd({ email: testUser.email }) : weakPwd;

        const response = await app.request
          .post('/api/v1/auth/reset-password')
          .set('x-e2e-bypass-rate-limit', 'true')
          .send({
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
    });
  });

  describe('BUG-PWD-008: Session Invalidation After Password Reset', () => {
    /**
     * EXPECTED BEHAVIOR: All active sessions should be invalidated after password reset
     *
     * Session invalidation is now SYNCHRONOUS within the use case.
     * No timing dependencies - when API returns, sessions are already invalidated.
     */
    it('should invalidate all sessions after password reset', async () => {
      const app = await getApp();
      const testUser = await freshInDbUser(app);

      const oldAccessToken = testUser.token;

      // Old token works BEFORE reset
      const beforeReset = await app.request
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${oldAccessToken}`);
      expect(beforeReset.status).toBe(200);

      // The token-valid-after gate stores Unix-second precision, so a JWT
      // issued in the same wall-clock second as the reset would still
      // satisfy `iat > validAfter`. Sleep one tick to push iat into the
      // past before invalidation.
      await new Promise((r) => setTimeout(r, 1100));

      // Token é armazenado como SHA-256 (token-hash.ts); o cliente
      // recebe plaintext, o backend grava o hash. Spec precisa hashear
      // antes de inserir.
      const { createHash } = await import('node:crypto');
      const plainToken = randomUUID();
      const tokenHash = createHash('sha256').update(plainToken).digest('hex');
      await app.prisma.passwordResetToken.create({
        data: {
          token: tokenHash,
          userId: testUser.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const resetResponse = await app.request
        .post('/api/v1/auth/reset-password')
        .set('x-e2e-bypass-rate-limit', 'true')
        .send({
          token: plainToken,
          newPassword: 'CompletelyNewPassword123!',
        });
      expect(resetResponse.status).toBe(201);

      const afterReset = await app.request
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${oldAccessToken}`);
      expect(afterReset.status).toBe(401);
    });
  });
});
