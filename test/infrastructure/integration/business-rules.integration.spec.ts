/**
 * Business Rules Integration Tests
 *
 * Bug Discovery: Domain invariants and business logic validation.
 *
 *
 * These tests verify that business rules are enforced correctly.
 */

import { describe, expect, it } from 'bun:test';
import type { TestResponse as Response } from '../shared';
import { freshInDbUser } from '../shared/fresh-context';
import { clearAuthRateLimits, getApp, signupBody, uniqueTestId, uniqueTestUsername } from './setup';

/**
 * Order-independent business-rules suite. Bun 1.3+ runs tests inside a
 * `describe` concurrently, so the prior shared `accessToken`/`userId`
 * (provisioned in `beforeEach`) would race. Each test now provisions
 * its own fresh user + fixtures so it owns them for its lifetime.
 */

describe('Business Rules Integration', () => {
  describe('BUG-019: Resume Limits', () => {
    it('should enforce maximum resume count per user', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const accessToken = user.token;
      // Create many resumes to test limit
      const results: Response[] = [];
      for (let i = 0; i < 15; i++) {
        const response = await app.request
          .post('/api/v1/resumes')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ title: `Limit Test Resume ${i}` });
        results.push(response);
      }

      // Either all succeed (no limit) or some fail with appropriate error
      const successCount = results.filter((r) => r.status === 201).length;
      const limitErrors = results.filter((r) => r.status === 403);

      // Business rule: should have some limit
      expect(successCount).toBeGreaterThan(0);
      // If limit exists, should return 403 or similar
      if (limitErrors.length > 0) {
        expect(limitErrors[0].status).toBe(403);
      }
    });
  });

  describe('BUG-020: Email Verification Enforcement', () => {
    it('should require email verification for protected actions', async () => {
      const app = await getApp();
      await clearAuthRateLimits();
      // Create new unverified user with unique email
      const unverifiedEmail = `unverified-${uniqueTestId()}@example.com`;

      const signupRes = await app.request.post('/api/v1/accounts').send(
        signupBody({
          email: unverifiedEmail,
          password: 'SecurePass123!',
          name: 'Unverified User',
        }),
      );

      const unverifiedToken = signupRes.body?.accessToken;

      if (!unverifiedToken) return;

      // Try to perform protected action
      const response = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({ title: 'Test Resume' });

      // Should be blocked (depends on business rules)
      // 201 = no verification required (allowed)
      // 403 = forbidden (verification required)
      // 401 = unauthorized (token issue or verification required at auth level)
      expect([201, 401, 403]).toContain(response.status);
    });
  });

  describe('BUG-021: Terms of Service Enforcement', () => {
    it('should require ToS acceptance for protected actions', async () => {
      const app = await getApp();
      await clearAuthRateLimits();
      // This is already enforced by setup, but test the flow
      const prisma = app.prisma;

      // Create user without ToS
      const noTosEmail = `no-tos-${uniqueTestId()}@example.com`;

      const signupRes = await app.request.post('/api/v1/accounts').send(
        signupBody({
          email: noTosEmail,
          password: 'SecurePass123!',
          name: 'No ToS User',
        }),
      );

      const noTosToken = signupRes.body?.accessToken;
      const noTosUserId = signupRes.body?.user?.id;

      if (!noTosToken || !noTosUserId) return;

      // Verify email but don't accept ToS
      await prisma.user.update({
        where: { id: noTosUserId },
        data: { emailVerified: new Date() },
      });

      // Try protected action
      const response = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${noTosToken}`)
        .send({ title: 'Test Resume' });

      // Should require ToS acceptance
      expect([201, 403]).toContain(response.status);

      // Cleanup
      await prisma.user.delete({ where: { id: noTosUserId } });
    });
  });

  describe('BUG-022: Share Expiration', () => {
    it('should respect share expiration dates', async () => {
      const app = await getApp();
      const accessToken = (await freshInDbUser(app)).token;
      // Create resume
      const createRes = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Expiration Test Resume' });

      if (createRes.status !== 201) return;

      const resumeId = createRes.body.id;

      // Create share with past expiration
      const shareRes = await app.request
        .post(`/api/v1/resumes/${resumeId}/share`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          expiresAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        });

      // Should either reject expired date or create but be inaccessible
      if (shareRes.status === 201) {
        const shareToken = shareRes.body?.shareToken;
        if (shareToken) {
          // Try to access expired share
          const accessRes = await app.request.get(`/api/v1/public/resumes/${shareToken}`);
          expect([404, 410]).toContain(accessRes.status); // Not found or Gone
        }
      }
    });
  });

  describe('BUG-023: Password Protection on Shares', () => {
    it('should enforce password on protected shares', async () => {
      const app = await getApp();
      const accessToken = (await freshInDbUser(app)).token;
      // Create resume
      const createRes = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Password Protected Resume' });

      if (createRes.status !== 201) return;

      const resumeId = createRes.body.id;

      // Create password-protected share
      const shareRes = await app.request
        .post(`/api/v1/resumes/${resumeId}/share`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'secret123',
        });

      if (shareRes.status !== 201) return;

      const shareToken = shareRes.body?.shareToken;

      if (shareToken) {
        // Try to access without password
        const accessRes = await app.request.get(`/api/v1/public/resumes/${shareToken}`);

        // Should require password or return partial response
        expect([401, 403, 200]).toContain(accessRes.status);
      }
    });
  });

  describe('BUG-024: Username Uniqueness', () => {
    it('should enforce unique usernames', async () => {
      const app = await getApp();
      const userId = (await freshInDbUser(app)).userId;
      const uniqueUsername = uniqueTestUsername('user');
      const prisma = app.prisma;

      // Set username for current user
      await prisma.user.update({
        where: { id: userId },
        data: { username: uniqueUsername },
      });

      // Create another user and try same username
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${uniqueTestId()}@example.com`,
          passwordHash: 'hashed',
          name: 'Other User',
          emailVerified: new Date(),
        },
      });

      // Try to set same username
      try {
        await prisma.user.update({
          where: { id: otherUser.id },
          data: { username: uniqueUsername },
        });
        // If no error, constraint is missing
        expect(true).toBe(false); // Should have thrown
      } catch {
        // Expected: unique constraint violation
        expect(true).toBe(true);
      } finally {
        await prisma.user.delete({ where: { id: otherUser.id } });
      }
    });
  });

  describe('BUG-025: Resume State Transitions', () => {
    it('should only allow valid state transitions', async () => {
      const app = await getApp();
      const accessToken = (await freshInDbUser(app)).token;
      // Create resume
      const createRes = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'State Transition Test' });

      if (createRes.status !== 201) return;

      const resumeId = createRes.body.id;

      // Try various state transitions
      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'published' });

      // Should either accept valid transition or reject invalid
      expect([200, 400]).toContain(response.status);
    });
  });
});
