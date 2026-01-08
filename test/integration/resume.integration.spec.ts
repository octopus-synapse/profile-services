import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  getRequest,
  getApp,
  closeApp,
  testContext,
  createTestUserAndLogin,
  authHeader,
} from './setup';

describe('Resume Smoke Tests', () => {
  let resumeId: string;

  beforeAll(async () => {
    await getApp();
    // Ensure we have an authenticated user
    if (!testContext.accessToken) {
      await createTestUserAndLogin();
    }
  });

  afterAll(async () => {
    await closeApp();
  });

  describe('POST /api/resumes', () => {
    it('should create a new resume', async () => {
      const res = await getRequest()
        .post('/api/v1/resumes')
        .set(authHeader())
        .send({
          title: 'Smoke Test Resume',
          jobTitle: 'Software Engineer',
          summary: 'This is a smoke test resume',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('Smoke Test Resume');

      resumeId = res.body.data.id;
      testContext.resumeId = resumeId;
    });

    it('should reject without authentication', async () => {
      const res = await getRequest().post('/api/v1/resumes').send({
        title: 'Unauthorized Resume',
      });

      expect(res.status).toBe(401);
    });

    it('should create resume with empty body (all fields optional)', async () => {
      const res = await getRequest()
        .post('/api/v1/resumes')
        .set(authHeader())
        .send({});

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
    });
  });

  describe('GET /api/resumes', () => {
    it('should list user resumes', async () => {
      const res = await getRequest().get('/api/v1/resumes').set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      const res = await getRequest()
        .get('/api/v1/resumes')
        .query({ page: 1, limit: 5 })
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should reject without authentication', async () => {
      const res = await getRequest().get('/api/v1/resumes');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/resumes/:id', () => {
    it('should return specific resume', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${resumeId}`)
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toBe(resumeId);
      expect(res.body.data.title).toBe('Smoke Test Resume');
    });

    it('should return 404 for non-existent resume', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await getRequest()
        .get(`/api/v1/resumes/${fakeId}`)
        .set(authHeader());

      expect(res.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const res = await getRequest().get(`/api/v1/resumes/${resumeId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/resumes/:id', () => {
    it('should update resume', async () => {
      const res = await getRequest()
        .patch(`/api/v1/resumes/${resumeId}`)
        .set(authHeader())
        .send({
          title: 'Updated Smoke Test Resume',
          jobTitle: 'Senior Software Engineer',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.title).toBe('Updated Smoke Test Resume');
      expect(res.body.data.jobTitle).toBe('Senior Software Engineer');
    });

    it('should reject update for non-existent resume', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await getRequest()
        .patch(`/api/v1/resumes/${fakeId}`)
        .set(authHeader())
        .send({ title: 'New Title' });

      // Returns 403 (Forbidden) instead of 404 for security
      // Owner verification happens before existence check
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/resumes/:id/full', () => {
    it('should return resume with all sections', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${resumeId}/full`)
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('experiences');
      expect(res.body.data).toHaveProperty('education');
      expect(res.body.data).toHaveProperty('skills');
    });
  });

  describe('DELETE /api/resumes/:id', () => {
    let tempResumeId: string;

    beforeAll(async () => {
      // Create a temporary resume to delete
      const res = await getRequest()
        .post('/api/v1/resumes')
        .set(authHeader())
        .send({
          title: 'Temp Resume for Deletion',
        });

      tempResumeId = res.body.data.id;
    });

    it('should delete resume', async () => {
      const res = await getRequest()
        .delete(`/api/v1/resumes/${tempResumeId}`)
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 after deletion', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${tempResumeId}`)
        .set(authHeader());

      expect(res.status).toBe(404);
    });

    it('should reject delete for non-existent resume', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await getRequest()
        .delete(`/api/v1/resumes/${fakeId}`)
        .set(authHeader());

      // Returns 403 (Forbidden) instead of 404 for security
      // Owner verification happens before existence check
      expect(res.status).toBe(403);
    });
  });
});
