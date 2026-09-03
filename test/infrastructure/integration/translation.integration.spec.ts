/**
 * Translation Integration Tests
 *
 * The translation surface is health + language detection; the raw
 * text/batch endpoints were removed (no client, and a general-purpose LLM
 * translator billed to any account). When OPENAI_API_KEY is unset the health
 * endpoint reports `unavailable` and the detect test skips its happy path —
 * CI without a key still exercises auth and routing, and confirms the removed
 * routes stay gone.
 *
 * Tests are skipped when DATABASE_URL is missing or SKIP_INTEGRATION is set.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { closeApp, createTestUserAndLogin, getApp, getRequest } from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Translation Integration', () => {
  let accessToken: string;
  let setupFailed = false;
  let translationAvailable = false;

  beforeAll(async () => {
    try {
      await getApp();
      const auth = await createTestUserAndLogin();
      accessToken = auth.accessToken;

      // Check if translation service is available
      const healthRes = await getRequest().get('/api/v1/translation/health');
      translationAvailable = healthRes.status === 200 && healthRes.body?.data?.status === 'healthy';
    } catch {
      setupFailed = true;
    }
  });

  afterAll(async () => {
    await closeApp();
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/translation/health - Public health check
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/translation/health', () => {
    it('should return health status without authentication', async () => {
      if (setupFailed) return;

      const res = await getRequest().get('/api/v1/translation/health');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.status).toBeDefined();
      expect(['healthy', 'unavailable']).toContain(res.body.status);
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return a valid ISO timestamp', async () => {
      if (setupFailed) return;

      const res = await getRequest().get('/api/v1/translation/health');

      expect(res.status).toBe(200);
      const timestamp = new Date(res.body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/translation/detect — the one LLM route that stays
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/translation/detect', () => {
    it('should require authentication', async () => {
      if (setupFailed) return;
      const res = await getRequest().post('/api/v1/translation/detect').send({ text: 'Olá' });
      expect(res.status).toBe(401);
    });

    it('should reject empty text', async () => {
      if (setupFailed) return;
      const res = await getRequest()
        .post('/api/v1/translation/detect')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '' });
      expect(res.status).toBe(400);
    });

    it('should detect the language when the provider is available', async () => {
      if (setupFailed || !translationAvailable) return;
      const res = await getRequest()
        .post('/api/v1/translation/detect')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Bom dia, tudo bem?' });
      expect(res.status).toBe(200);
    });
  });

  describe('removed raw translation routes', () => {
    for (const path of ['text', 'batch', 'pt-to-en', 'en-to-pt']) {
      it(`POST /api/v1/translation/${path} is gone`, async () => {
        if (setupFailed) return;
        const res = await getRequest()
          .post(`/api/v1/translation/${path}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ text: 'x' });
        expect(res.status).toBe(404);
      });
    }
  });
});
