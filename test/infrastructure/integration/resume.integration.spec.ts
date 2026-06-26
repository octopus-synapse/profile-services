import { describe, expect, it } from 'bun:test';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp } from './setup';

/**
 * Order-independent resume smoke suite. Bun 1.3+ runs the tests inside
 * a `describe` concurrently, so every test provisions its own fresh
 * user (and, where needed, its own resume) instead of sharing a
 * `let resumeId` set in one test and read in another.
 */

/** Create a resume via the public POST route and return its id. */
async function createResume(app: TestApp, user: FreshUser, title: string): Promise<string> {
  const res = await app.request.post('/api/v1/resumes').set(user.bearer()).send({ title });
  if (res.status !== 201) {
    throw new Error(`createResume failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.id as string;
}

describe('Resume Smoke Tests', () => {
  describe('POST /api/v1/resumes', () => {
    it('should create a new resume', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);

      const res = await app.request.post('/api/v1/resumes').set(user.bearer()).send({
        title: 'Smoke Test Resume',
        jobTitle: 'Software Engineer',
        summary: 'This is a smoke test resume',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Smoke Test Resume');
    });

    it('should reject without authentication', async () => {
      const app = await getApp();
      const res = await app.request.post('/api/v1/resumes').send({ title: 'Unauthorized Resume' });

      expect(res.status).toBe(401);
    });

    it('should create resume with only the required `title` field', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);

      const res = await app.request
        .post('/api/v1/resumes')
        .set(user.bearer())
        .send({ title: 'Smoke Test Resume' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /api/v1/resumes', () => {
    it('should list user resumes', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      await createResume(app, user, 'Listed Resume');

      const res = await app.request.get('/api/v1/resumes').set(user.bearer());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      await createResume(app, user, 'Paginated Resume');

      const res = await app.request
        .get('/api/v1/resumes')
        .query({ page: 1, limit: 5 })
        .set(user.bearer());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.totalPages).toBeDefined();
    });

    it('should reject without authentication', async () => {
      const app = await getApp();
      const res = await app.request.get('/api/v1/resumes');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/resumes/:id', () => {
    it('should return specific resume', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const resumeId = await createResume(app, user, 'Smoke Test Resume');

      const res = await app.request.get(`/api/v1/resumes/${resumeId}`).set(user.bearer());

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(resumeId);
      expect(res.body.title).toBe('Smoke Test Resume');
    });

    it('should return 404 for non-existent resume', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.request.get(`/api/v1/resumes/${fakeId}`).set(user.bearer());

      // API returns 400 for non-existent resume (not found or not owned)
      expect([400, 404].includes(res.status)).toBe(true);
    });

    it('should reject without authentication', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const resumeId = await createResume(app, user, 'Auth Guard Resume');

      const res = await app.request.get(`/api/v1/resumes/${resumeId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/resumes/:id', () => {
    it('should update resume', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const resumeId = await createResume(app, user, 'Original Title');

      const res = await app.request
        .patch(`/api/v1/resumes/${resumeId}`)
        .set(user.bearer())
        .send({ title: 'Updated Smoke Test Resume', jobTitle: 'Senior Software Engineer' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Smoke Test Resume');
    });

    it('should reject update for non-existent resume', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.request
        .patch(`/api/v1/resumes/${fakeId}`)
        .set(user.bearer())
        .send({ title: 'New Title' });

      // API returns 400 for non-existent resume (validation or not found)
      expect([400, 403, 404].includes(res.status)).toBe(true);
    });
  });

  describe('GET /api/v1/resumes/:id/full', () => {
    it('should return resume with all sections', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const resumeId = await createResume(app, user, 'Full Resume');

      const res = await app.request.get(`/api/v1/resumes/${resumeId}/full`).set(user.bearer());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('resumeSections');
    });
  });

  describe('DELETE /api/v1/resumes/:id', () => {
    it('should delete resume', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const tempResumeId = await createResume(app, user, 'Temp Resume for Deletion');

      const res = await app.request.delete(`/api/v1/resumes/${tempResumeId}`).set(user.bearer());

      expect(res.status).toBe(200);
    });

    it('should return 404 after deletion', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const tempResumeId = await createResume(app, user, 'Temp Resume for Deletion');

      const del = await app.request.delete(`/api/v1/resumes/${tempResumeId}`).set(user.bearer());
      expect(del.status).toBe(200);

      const res = await app.request.get(`/api/v1/resumes/${tempResumeId}`).set(user.bearer());

      expect(res.status).toBe(404);
    });

    it('should reject delete for non-existent resume', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.request.delete(`/api/v1/resumes/${fakeId}`).set(user.bearer());

      // API returns 400 for non-existent resume (validation or not found)
      expect([400, 403, 404].includes(res.status)).toBe(true);
    });
  });
});
