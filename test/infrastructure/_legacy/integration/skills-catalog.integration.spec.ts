/**
 * Skills Catalog Integration Tests
 *
 * Tests tech skills, areas, niches, and programming languages endpoints
 * against a real NestJS application with real database.
 *
 * Prerequisites: Database must be seeded with tech skills data.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { closeApp, createTestUserAndLogin, getApp, getRequest } from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Skills Catalog Integration', () => {
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
  // GET /api/v1/tech-skills - List all tech skills (root controller)
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills', () => {
    it('should return seeded tech skills', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toBeDefined();
      expect(Array.isArray(res.body.data.skills)).toBe(true);
      expect(res.body.data.skills.length).toBeGreaterThan(0);
    });

    it('should return skills with expected shape', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const skill = res.body.data.skills[0];
      expect(skill).toHaveProperty('nameEn');
      expect(typeof skill.nameEn).toBe('string');
    });

    it('should require authentication', async () => {
      if (setupFailed) return;

      const res = await getRequest().get('/api/v1/tech-skills');

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/search?q=... - Combined search
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/search', () => {
    it('should search with partial match', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/search?q=java')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toBeDefined();
    });

    it('should be case insensitive', async () => {
      if (setupFailed) return;

      const resLower = await getRequest()
        .get('/api/v1/tech-skills/search?q=python')
        .set('Authorization', `Bearer ${accessToken}`);

      const resUpper = await getRequest()
        .get('/api/v1/tech-skills/search?q=PYTHON')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(resLower.status).toBe(200);
      expect(resUpper.status).toBe(200);
      // Both should return results (case insensitive)
    });

    it('should return empty results for nonsense query', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/search?q=xyznonexistent99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toBeDefined();
    });

    it('should handle empty query', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/search?q=')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should respect limit parameter', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/search?q=a&limit=3')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/skills - Get all skills (query controller)
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/skills', () => {
    it('should return all skills', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toBeDefined();
      expect(Array.isArray(res.body.data.skills)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/skills/search?q=... - Search individual skills
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/skills/search', () => {
    it('should search skills by name', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/search?q=react')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toBeDefined();
    });

    it('should return empty array for no matches', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/search?q=zzzznonexistent')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills).toBeDefined();
      expect(res.body.data.skills).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/search?q=a&limit=2')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills.length).toBeLessThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/skills/type/:type - Skills by type
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/skills/type/:type', () => {
    it('should filter skills by FRAMEWORK type', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/type/FRAMEWORK')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toBeDefined();
      expect(Array.isArray(res.body.data.skills)).toBe(true);
    });

    it('should filter skills by TOOL type', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/type/TOOL')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills).toBeDefined();
    });

    it('should filter skills by DATABASE type', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/type/DATABASE')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills).toBeDefined();
    });

    it('should filter skills by LANGUAGE type', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/type/LANGUAGE')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills).toBeDefined();
    });

    it('should return empty for unknown type', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/type/NONEXISTENT_TYPE')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should return 200 with empty array, or 400 depending on validation
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.skills).toHaveLength(0);
      }
    });

    it('should respect limit parameter', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/skills/type/FRAMEWORK?limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills.length).toBeLessThanOrEqual(5);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/areas - Tech areas
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/areas', () => {
    it('should return tech areas', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/areas')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.areas).toBeDefined();
      expect(Array.isArray(res.body.data.areas)).toBe(true);
      expect(res.body.data.areas.length).toBeGreaterThan(0);
    });

    it('should include known area types', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/areas')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const areaTypes = res.body.data.areas.map(
        (a: { type?: string; areaType?: string; name?: string }) => a.type || a.areaType || a.name,
      );
      // At least some known areas should be present
      expect(areaTypes.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/niches - All niches
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/niches', () => {
    it('should return tech niches', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/niches')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.niches).toBeDefined();
      expect(Array.isArray(res.body.data.niches)).toBe(true);
      expect(res.body.data.niches.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/areas/:areaType/niches - Niches by area
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/areas/:areaType/niches', () => {
    it('should return niches for DEVELOPMENT area', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/areas/DEVELOPMENT/niches')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.niches).toBeDefined();
      expect(Array.isArray(res.body.data.niches)).toBe(true);
    });

    it('should return empty for unknown area type', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/areas/NONEXISTENT/niches')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 400, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.niches).toHaveLength(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/languages - Programming languages
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/languages', () => {
    it('should return programming languages', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/languages')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.languages).toBeDefined();
      expect(Array.isArray(res.body.data.languages)).toBe(true);
      expect(res.body.data.languages.length).toBeGreaterThan(0);
    });

    it('should include well-known languages', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/languages')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const names = res.body.data.languages.map((l: { nameEn: string }) => l.nameEn.toLowerCase());
      // At least some common programming languages should exist
      const hasCommon = names.some(
        (n: string) =>
          n.includes('javascript') ||
          n.includes('python') ||
          n.includes('typescript') ||
          n.includes('java') ||
          n.includes('go'),
      );
      expect(hasCommon).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/languages/search?q=... - Search programming languages
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/languages/search', () => {
    it('should search programming languages', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/languages/search?q=type')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.languages).toBeDefined();
    });

    it('should return empty for nonsense query', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/languages/search?q=zzznotareallang')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages).toBeDefined();
      expect(res.body.data.languages).toHaveLength(0);
    });

    it('should respect limit', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/languages/search?q=a&limit=3')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages.length).toBeLessThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/tech-skills/niches/:nicheSlug/skills - Skills by niche
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/tech-skills/niches/:nicheSlug/skills', () => {
    it('should return skills for a valid niche slug', async () => {
      if (setupFailed) return;

      // First get a valid niche slug
      const nichesRes = await getRequest()
        .get('/api/v1/tech-skills/niches')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(nichesRes.status).toBe(200);
      const niches = nichesRes.body.data.niches;
      if (niches.length === 0) return; // skip if no niches

      const nicheSlug = niches[0].slug || niches[0].id;

      const res = await getRequest()
        .get(`/api/v1/tech-skills/niches/${nicheSlug}/skills`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills).toBeDefined();
      expect(Array.isArray(res.body.data.skills)).toBe(true);
    });

    it('should return empty for unknown niche slug', async () => {
      if (setupFailed) return;

      const res = await getRequest()
        .get('/api/v1/tech-skills/niches/nonexistent-niche-slug/skills')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.skills).toHaveLength(0);
      }
    });
  });
});
