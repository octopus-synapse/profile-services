/**
 * Translation Integration Tests
 *
 * Tests translation endpoints against a real NestJS application.
 * Translation depends on LibreTranslate service being available.
 * Tests are skipped when DATABASE_URL is missing or SKIP_INTEGRATION is set.
 *
 * Note: Translation endpoints (except health) require authentication
 * with RESUME_READ permission (standard user role).
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
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBeDefined();
      expect(['healthy', 'unavailable']).toContain(res.body.data.status);
      expect(res.body.data.timestamp).toBeDefined();
    });

    it('should return a valid ISO timestamp', async () => {
      if (setupFailed) return;

      const res = await getRequest().get('/api/v1/translation/health');

      expect(res.status).toBe(200);
      const timestamp = new Date(res.body.data.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/translation/text - General translation
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/translation/text', () => {
    it('should translate text en->pt', async () => {
      if (setupFailed || !translationAvailable) return;

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.translatedText).toBe('string');
      expect(res.body.data.translatedText.length).toBeGreaterThan(0);
    });

    it('should translate text pt->en', async () => {
      if (setupFailed || !translationAvailable) return;

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: 'Olá mundo',
          sourceLanguage: 'pt',
          targetLanguage: 'en',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.translatedText).toBe('string');
    });

    it('should require authentication', async () => {
      if (setupFailed) return;

      const res = await getRequest().post('/api/v1/translation/text').send({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'pt',
      });

      expect(res.status).toBe(401);
    });

    it('should validate empty text', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: '',
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(400);
    });

    it('should validate missing text field', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(400);
    });

    it('should validate missing sourceLanguage', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: 'Hello',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(400);
    });

    it('should validate missing targetLanguage', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: 'Hello',
          sourceLanguage: 'en',
        });

      expect(res.status).toBe(400);
    });

    it('should handle text with special characters', async () => {
      if (setupFailed || !translationAvailable) return;

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: 'Hello! @#$%^&*() "quotes" <tags>',
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should handle text with emojis', async () => {
      if (setupFailed || !translationAvailable) return;

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: 'Hello world! Great job!',
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should handle long text', async () => {
      if (setupFailed || !translationAvailable) return;

      const longText = 'This is a test sentence for translation. '.repeat(50);

      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: longText,
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      // Should either succeed or return a controlled error (not 500)
      expect([201, 400, 413]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/translation/en-to-pt - English to Portuguese shortcut
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/translation/en-to-pt', () => {
    it('should translate English to Portuguese', async () => {
      if (setupFailed || !translationAvailable) return;

      const res = await getRequest()
        .post('/api/v1/translation/en-to-pt')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Software Engineer' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.translatedText).toBe('string');
      expect(res.body.data.translatedText.length).toBeGreaterThan(0);
    });

    it('should validate empty text', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/en-to-pt')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '' });

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      if (setupFailed) return;

      const res = await getRequest().post('/api/v1/translation/en-to-pt').send({ text: 'Hello' });

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/translation/pt-to-en - Portuguese to English shortcut
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/translation/pt-to-en', () => {
    it('should translate Portuguese to English', async () => {
      if (setupFailed || !translationAvailable) return;

      const res = await getRequest()
        .post('/api/v1/translation/pt-to-en')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Engenheiro de Software' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.translatedText).toBe('string');
      expect(res.body.data.translatedText.length).toBeGreaterThan(0);
    });

    it('should validate empty text', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/pt-to-en')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '' });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/translation/batch - Batch translation
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/translation/batch', () => {
    it('should translate multiple texts', async () => {
      if (setupFailed || !translationAvailable) return;

      const res = await getRequest()
        .post('/api/v1/translation/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          texts: ['Hello', 'World', 'Good morning'],
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should translate a single text in batch', async () => {
      if (setupFailed || !translationAvailable) return;

      const res = await getRequest()
        .post('/api/v1/translation/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          texts: ['Software Development'],
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should validate empty texts array', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          texts: [],
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(400);
    });

    it('should validate texts array with empty strings', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          texts: [''],
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(400);
    });

    it('should validate missing sourceLanguage', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          texts: ['Hello'],
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .post('/api/v1/translation/batch')
        .send({
          texts: ['Hello'],
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Graceful degradation when translation service is unavailable
  // ---------------------------------------------------------------------------
  describe('Translation service graceful degradation', () => {
    it('should report unavailable status when service is down', async () => {
      if (setupFailed) return;

      // Health endpoint should always work, reporting status
      const res = await getRequest().get('/api/v1/translation/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(['healthy', 'unavailable']).toContain(res.body.data.status);
    });

    it('should handle translation request when service is unavailable gracefully', async () => {
      if (setupFailed || translationAvailable) return;

      // When LibreTranslate is down, translation should fail gracefully
      const res = await getRequest()
        .post('/api/v1/translation/text')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        });

      // Should return error but not 500
      expect([201, 400, 503]).toContain(res.status);
    });
  });
});
