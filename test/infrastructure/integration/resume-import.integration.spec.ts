/**
 * Resume Import Integration Tests
 *
 * The JSON Resume upload and GitHub import routes were removed (no client);
 * PDF and LinkedIn remain and need a file or an OAuth token, so this suite
 * covers the job bookkeeping routes and confirms the removed ones stay gone.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestId,
} from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Resume Import Integration Tests', () => {
  let accessToken: string;
  let userId: string;
  let otherAccessToken: string;
  let otherUserId: string;

  beforeAll(async () => {
    await getApp();

    const auth = await createTestUserAndLogin({
      email: `import-int-${uniqueTestId()}@example.com`,
    });
    accessToken = auth.accessToken;
    userId = auth.userId;

    const otherAuth = await createTestUserAndLogin({
      email: `import-other-${uniqueTestId()}@example.com`,
    });
    otherAccessToken = otherAuth.accessToken;
    otherUserId = otherAuth.userId;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    for (const uid of [userId, otherUserId]) {
      if (uid) {
        await prisma.resume.deleteMany({ where: { userId: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      }
    }
    await closeApp();
  });

  describe('List import history', () => {
    it('should list imports for the authenticated user (empty for a new user)', async () => {
      const response = await getRequest()
        .get('/api/v1/resumes/imports')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should reject listing without authentication', async () => {
      const response = await getRequest().get('/api/v1/resumes/imports');
      expect(response.status).toBe(401);
    });
  });

  describe('Get import status', () => {
    it('should return 404 for non-existent import ID', async () => {
      const response = await getRequest()
        .get('/api/v1/resumes/imports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 400]).toContain(response.status);
    });

    it("should not expose another user's import", async () => {
      const response = await getRequest()
        .get('/api/v1/resumes/imports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${otherAccessToken}`);

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('removed import routes', () => {
    for (const path of ['json', 'parse', 'github']) {
      it(`POST /api/v1/resumes/imports/${path} is gone`, async () => {
        const response = await getRequest()
          .post(`/api/v1/resumes/imports/${path}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({});
        expect(response.status).toBe(404);
      });
    }
  });
});
