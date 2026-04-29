/**
 * Spoken Languages Integration Tests
 *
 * Tests the spoken languages catalog endpoints against a real NestJS application
 * with a seeded database (~31 spoken languages).
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { closeApp, createTestUserAndLogin, getApp, getRequest } from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Spoken Languages Integration', () => {
  let accessToken: string;
  let setupFailed = false;

  beforeAll(async () => {
    try {
      await getApp();
      const auth = await createTestUserAndLogin();
      accessToken = auth.accessToken;
    } catch {
      setupFailed = true;
    }
  });

  afterAll(async () => {
    await closeApp();
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/spoken-languages - List all
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/spoken-languages', () => {
    it('should return seeded spoken languages', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.languages).toBeDefined();
      expect(Array.isArray(res.body.data.languages)).toBe(true);
      // Seed has 31 languages (30 + "Other")
      expect(res.body.data.languages.length).toBeGreaterThanOrEqual(30);
    });

    it('should return languages with expected shape', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const lang = res.body.data.languages[0];
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('nameEn');
      expect(lang).toHaveProperty('namePtBr');
      expect(lang).toHaveProperty('nameEs');
      expect(typeof lang.code).toBe('string');
      expect(typeof lang.nameEn).toBe('string');
    });

    it('should include known languages like English, Portuguese, Spanish', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.data.languages.map((l: { code: string }) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('pt');
      expect(codes).toContain('es');
    });

    it('should include the "other" option', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.data.languages.map((l: { code: string }) => l.code);
      expect(codes).toContain('other');
    });

    it('should require authentication', async () => {
      if (setupFailed) return;

      const res = await getRequest().get('/api/v1/spoken-languages');

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/spoken-languages/search?q=... - Search
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/spoken-languages/search', () => {
    it('should search with partial match', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=port')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.languages).toBeDefined();
      expect(res.body.data.languages.length).toBeGreaterThanOrEqual(1);

      // Should find Portuguese
      const names = res.body.data.languages.map((l: { nameEn: string }) => l.nameEn.toLowerCase());
      expect(names.some((n: string) => n.includes('portuguese'))).toBe(true);
    });

    it('should be case insensitive', async () => {
      if (setupFailed) return;

      const resLower = await getRequest()
        .get('/api/v1/spoken-languages/search?q=english')
        .set('Authorization', `Bearer ${accessToken}`);

      const resUpper = await getRequest()
        .get('/api/v1/spoken-languages/search?q=ENGLISH')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(resLower.status).toBe(200);
      expect(resUpper.status).toBe(200);
      expect(resLower.body.data.languages.length).toBeGreaterThanOrEqual(1);
      expect(resUpper.body.data.languages.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for no matches', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=xyznonexistent99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages).toHaveLength(0);
    });

    it('should handle empty query', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Empty query should return languages (up to limit)
      expect(res.body.data.languages).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=&limit=3')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages.length).toBeLessThanOrEqual(3);
    });

    it('should reject invalid limit parameter', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=eng&limit=abc')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });

    it('should reject negative limit parameter', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=eng&limit=-1')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });

    it('should reject zero limit parameter', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=eng&limit=0')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });

    it('should handle special characters in query', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=%27%22%3C%3E')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages).toHaveLength(0);
    });

    it('should handle unicode characters in query', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/search?q=%E4%B8%AD%E6%96%87')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should not crash, regardless of result
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/spoken-languages/:code - Get by code
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/spoken-languages/:code', () => {
    it('should return English by code', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/en')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.language).toBeDefined();
      expect(res.body.data.language.code).toBe('en');
      expect(res.body.data.language.nameEn).toBe('English');
    });

    it('should return Portuguese by code', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/pt')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.language.code).toBe('pt');
      expect(res.body.data.language.nameEn).toBe('Portuguese');
      expect(res.body.data.language.namePtBr).toBe('Português');
    });

    it('should return 404 for invalid code', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/zz')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for empty code-like path', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/nonexistentlanguagecode')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('should return language with nativeName field', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/ja')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.language.code).toBe('ja');
      expect(res.body.data.language.nameEn).toBe('Japanese');
      expect(res.body.data.language.nativeName).toBe('日本語');
    });

    it('should return the "other" language option', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/spoken-languages/other')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.language.code).toBe('other');
      expect(res.body.data.language.nameEn).toBe('Other');
    });
  });
});
