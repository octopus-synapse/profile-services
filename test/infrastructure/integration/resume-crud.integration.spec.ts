/**
 * Resume CRUD Integration Tests
 *
 * Tests complete resume lifecycle with real database.
 * Validates business rules: 4 resume limit, ownership, etc.
 *
 * Order-independent: each test provisions its own fully-onboarded user
 * via `freshInDbUser(app)` and owns its resumes for its lifetime. Bun
 * runs tests inside a `describe` concurrently (1.3+), so shared
 * `let accessToken/userId/resumeId` would race. No `afterAll` tearing
 * down the shared app — it's reused by other parallel spec files.
 */

import { describe, expect, it } from 'bun:test';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp } from './setup';

/** Create a resume for `user` via the API and return its id. */
async function createResume(
  app: TestApp,
  user: FreshUser,
  body: Record<string, unknown>,
): Promise<string> {
  const res = await app.request.post('/api/v1/resumes').set(user.bearer()).send(body).expect(201);
  return res.body.id as string;
}

describe('Resume CRUD Integration', () => {
  describe('Resume Creation', () => {
    it('should create a resume successfully', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);

      const resumeData = {
        title: 'My First Resume',
        summary: 'A professional software engineer with experience in...',
        fullName: 'John Doe',
        jobTitle: 'Senior Software Engineer',
      };

      const response = await app.request
        .post('/api/v1/resumes')
        .set(user.bearer())
        .send(resumeData)
        .expect(201);
      expect(response.body.title).toBe(resumeData.title);
    });

    it('should reject resume creation without authentication', async () => {
      const app = await getApp();
      await app.request.post('/api/v1/resumes').send({ title: 'Unauthorized Resume' }).expect(401);
    });
  });

  describe('Resume Retrieval', () => {
    it('should retrieve own resume by ID', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const resumeId = await createResume(app, user, {
        title: 'Test Resume for Retrieval',
        fullName: 'Test User',
      });

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}`)
        .set(user.bearer())
        .expect(200);

      expect(response.body.id).toBe(resumeId);
      expect(response.body.title).toBe('Test Resume for Retrieval');
    });

    it('should list all user resumes', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);

      await createResume(app, user, { title: 'First Resume', fullName: 'Test' });
      await createResume(app, user, { title: 'Second Resume', fullName: 'Test' });

      const response = await app.request.get('/api/v1/resumes').set(user.bearer()).expect(200);

      expect(response.body.items.length).toBe(2);
    });
  });

  describe('Resume Update', () => {
    it('should update resume successfully', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const resumeId = await createResume(app, user, {
        title: 'Resume to Update',
        fullName: 'Original Name',
      });

      const updateData = {
        title: 'Updated Resume Title',
        fullName: 'Updated Name',
        summary: 'New summary content',
      };

      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}`)
        .set(user.bearer())
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
    });
  });

  describe('Resume Deletion', () => {
    it('should delete own resume', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const resumeId = await createResume(app, user, {
        title: 'Resume to Delete',
        fullName: 'Delete Test',
      });

      await app.request.delete(`/api/v1/resumes/${resumeId}`).set(user.bearer()).expect(200);

      // Verify deletion
      await app.request.get(`/api/v1/resumes/${resumeId}`).set(user.bearer()).expect(404);
    });
  });

  describe('Resume Limit (Max 4)', () => {
    it('should allow creating up to 4 resumes', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);

      for (let i = 1; i <= 4; i++) {
        await createResume(app, user, { title: `Resume ${i}`, fullName: `User ${i}` });
      }

      const response = await app.request.get('/api/v1/resumes').set(user.bearer()).expect(200);

      expect(response.body.items.length).toBe(4);
    });

    it('should reject 5th resume creation', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);

      for (let i = 1; i <= 4; i++) {
        await createResume(app, user, { title: `Resume ${i}`, fullName: `User ${i}` });
      }

      const response = await app.request
        .post('/api/v1/resumes')
        .set(user.bearer())
        .send({ title: 'Resume 5', fullName: 'User 5' })
        .expect(422);

      expect(response.body.message.includes('limit')).toBe(true);
    });
  });

  describe('Resume Visibility', () => {
    it('should toggle resume visibility', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const resumeId = await createResume(app, user, {
        title: 'Public Resume Test',
        fullName: 'Public User',
      });

      // Make public
      await app.request
        .patch(`/api/v1/resumes/${resumeId}`)
        .set(user.bearer())
        .send({ isPublic: true })
        .expect(200);

      // Verify it's public
      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}`)
        .set(user.bearer())
        .expect(200);

      expect(response.body.isPublic).toBe(true);
    });
  });
});
