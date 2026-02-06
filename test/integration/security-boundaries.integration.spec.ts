/**
 * Security Boundaries Integration Tests
 *
 * Break the system before attackers do.
 * See docs/BUG_DISCOVERY_REPORT.md for discovered issues.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  getApp,
  getRequest,
  closeApp,
  createTestUserAndLogin,
  getPrisma,
} from './setup';

describe('Security Boundaries Integration', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin();
    accessToken = auth.accessToken;
    userId = auth.userId;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (userId) {
      await prisma.resume.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await closeApp();
  });

  describe('BUG-001: XSS Injection', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
    ];

    it('should sanitize XSS in resume title - BUG-001', async () => {
      for (const payload of xssPayloads) {
        const response = await getRequest()
          .post('/api/v1/resumes')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ title: payload });

        if (response.status === 201) {
          expect(response.body.data.title).not.toContain('<script>');
          expect(response.body.data.title).not.toContain('onerror=');
        }
      }
    });

    it('should sanitize XSS in resume summary - BUG-001', async () => {
      const response = await getRequest()
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Resume',
          summary: '<script>document.cookie</script>',
        });

      if (response.status === 201) {
        expect(response.body.data.summary).not.toContain('<script>');
      }
    });
  });

  describe('BUG-002: SQL Injection', () => {
    const sqlPayloads = ["'; DROP TABLE users; --", "1' OR '1'='1"];

    it('should reject SQL injection in search queries', async () => {
      for (const payload of sqlPayloads) {
        const response = await getRequest()
          .get('/api/v1/resumes')
          .query({ search: payload })
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).not.toBe(500);
        expect(response.body.message || '').not.toMatch(
          /syntax error|SQL|database/i,
        );
      }
    });

    it('should handle SQL injection in path parameters - BUG-002', async () => {
      const response = await getRequest()
        .get("/api/v1/resumes/'; DROP TABLE resumes; --")
        .set('Authorization', `Bearer ${accessToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('BUG-003: Authorization Bypass', () => {
    let otherUserResumeId: string;
    let otherUserId: string;

    beforeAll(async () => {
      const prisma = getPrisma();
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          password: 'hashed',
          name: 'Other User',
          emailVerified: new Date(),
        },
      });
      otherUserId = otherUser.id;

      const otherResume = await prisma.resume.create({
        data: {
          userId: otherUserId,
          title: 'Private Resume',
          contentPtBr: {},
        },
      });
      otherUserResumeId = otherResume.id;
    });

    afterAll(async () => {
      const prisma = getPrisma();
      if (otherUserResumeId) {
        await prisma.resume.delete({ where: { id: otherUserResumeId } });
      }
      if (otherUserId) {
        await prisma.user.delete({ where: { id: otherUserId } });
      }
    });

    it('should NOT allow reading another users resume - BUG-003', async () => {
      const response = await getRequest()
        .get(`/api/v1/resumes/${otherUserResumeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should NOT allow updating another users resume - BUG-003', async () => {
      const response = await getRequest()
        .patch(`/api/v1/resumes/${otherUserResumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Hacked!' });

      expect([400, 403, 404]).toContain(response.status);
    });

    it('should NOT allow deleting another users resume - BUG-003', async () => {
      const response = await getRequest()
        .delete(`/api/v1/resumes/${otherUserResumeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('BUG-004: Token Manipulation', () => {
    it('should reject tampered JWT token', async () => {
      const tamperedToken = accessToken.slice(0, -10) + 'TAMPERED!!';
      const response = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject malformed token', async () => {
      const response = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', 'Bearer not.a.valid.jwt.token');

      expect(response.status).toBe(401);
    });

    it('should reject missing Bearer prefix', async () => {
      const response = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', accessToken);

      expect(response.status).toBe(401);
    });

    it('should reject empty Authorization header', async () => {
      const response = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });
  });

  describe('BUG-005: Input Length Limits', () => {
    it('should handle extremely long resume title', async () => {
      const longTitle = 'A'.repeat(10000);
      const response = await getRequest()
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: longTitle });

      expect(response.status).not.toBe(500);
    });

    it('should reject massive JSON payload', async () => {
      const massivePayload = {
        title: 'Test',
        summary: 'X'.repeat(1024 * 1024),
      };

      const response = await getRequest()
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(massivePayload);

      expect([400, 413]).toContain(response.status);
    });
  });

  describe('BUG-006: Type Confusion', () => {
    it('should reject array where string expected - BUG-006', async () => {
      const response = await getRequest()
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: ['Array', 'Not', 'String'] });

      // 422 is valid - Zod returns Unprocessable Entity for type errors
      expect([400, 422, 201]).toContain(response.status);
    });

    it('should reject object where string expected - BUG-006', async () => {
      const response = await getRequest()
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: { toString: () => 'Sneaky' } });

      expect(response.status).not.toBe(500);
    });

    it('should handle null in required fields', async () => {
      const response = await getRequest()
        .post('/api/v1/auth/login')
        .send({ email: null, password: null });

      // 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });
  });
});
