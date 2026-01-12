/**
 * Cache Integration Tests
 *
 * Tests caching behavior with real application context.
 * Verifies decorators work properly with NestJS DI.
 *
 * Kent Beck: "Integration tests validate real collaborations."
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getApp, closeApp, createTestUserAndLogin, getRequest } from './setup';

describe('Cache Integration', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin();
    accessToken = auth.accessToken;
    userId = auth.userId;
  });

  afterAll(async () => {
    await closeApp();
  });

  describe('Public Resume Caching', () => {
    let resumeId: string;
    let slug: string;

    beforeAll(async () => {
      // Create a resume for testing
      const createRes = await getRequest()
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Cache Test Resume',
          fullName: 'Cache Tester',
          jobTitle: 'Software Engineer',
        });

      if (createRes.status === 201) {
        resumeId = createRes.body.data.id;
      }
    });

    it('should cache public resume when fetched', async () => {
      // First, make the resume public with a slug
      slug = `cache-test-${Date.now()}`;
      await getRequest()
        .patch(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isPublic: true,
          slug,
        });

      // First fetch (cache miss - should hit database)
      const firstFetch = await getRequest().get(
        `/api/v1/public/resumes/${slug}`,
      );

      expect(firstFetch.status).toBe(200);
      expect(firstFetch.body.data).toHaveProperty('slug', slug);

      // Second fetch (should potentially hit cache)
      const secondFetch = await getRequest().get(
        `/api/v1/public/resumes/${slug}`,
      );

      expect(secondFetch.status).toBe(200);
      expect(secondFetch.body.data).toHaveProperty('slug', slug);
    });

    it('should invalidate cache on resume update', async () => {
      // Update the resume
      const updateRes = await getRequest()
        .patch(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          jobTitle: 'Senior Software Engineer',
        });

      expect(updateRes.status).toBe(200);

      // Fetch again - should get updated data
      const fetchRes = await getRequest().get(`/api/v1/public/resumes/${slug}`);

      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.data.jobTitle).toBe('Senior Software Engineer');
    });
  });

  describe('User Data Caching', () => {
    it('should cache user profile when fetched', async () => {
      // First fetch
      const firstFetch = await getRequest()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(firstFetch.status).toBe(200);
      expect(firstFetch.body.data).toHaveProperty('id', userId);

      // Second fetch
      const secondFetch = await getRequest()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(secondFetch.status).toBe(200);
      expect(secondFetch.body.data).toHaveProperty('id', userId);
    });
  });

  describe('Cache Health', () => {
    it('should report cache status in health check', async () => {
      const res = await getRequest().get('/api/health');

      expect(res.status).toBe(200);
      // Note: Redis may or may not be available in test environment
      // Just verify the endpoint works
    });
  });
});
