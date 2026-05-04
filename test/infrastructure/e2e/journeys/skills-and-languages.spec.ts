/**
 * E2E Journey: Skills and Languages Catalog Browsing
 *
 * Simulates a real user journey:
 * 1. Browse tech skills catalog
 * 2. Search for specific skills
 * 3. Browse spoken languages
 * 4. Search spoken languages
 * 5. Get language details
 * 6. Verify seeded data integrity
 *
 * Target Time: < 15 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E: Skills and Languages Catalog Journey', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: { email: string; password: string; name: string; token?: string; userId?: string };

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;

    testUser = authHelper.createTestUser('skills_journey');
    const result = await authHelper.registerAndLogin(testUser);
    testUser.token = result.token;
    testUser.userId = result.userId;
  });

  afterAll(async () => {
    if (testUser?.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await stopTestApp();
  });

  // ---------------------------------------------------------------------------
  // Step 1: Browse Tech Skills Catalog
  // ---------------------------------------------------------------------------
  describe('Step 1: Browse Tech Skills Catalog', () => {
    it.serial('should list all tech skills', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toBeDefined();
      expect(Array.isArray(res.body.data.skills)).toBe(true);
      expect(res.body.data.skills.length).toBeGreaterThan(0);
    });

    it.serial('should list tech areas', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills/areas')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.areas).toBeDefined();
      expect(res.body.data.areas.length).toBeGreaterThan(0);
    });

    it.serial('should list tech niches', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills/niches')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.niches).toBeDefined();
      expect(res.body.data.niches.length).toBeGreaterThan(0);
    });

    it.serial('should list programming languages', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills/languages')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.languages).toBeDefined();
      expect(res.body.data.languages.length).toBeGreaterThan(0);
    });

    it.serial('should drill down: area -> niches', async () => {
      // Get areas first
      const areasRes = await app.request
        .get('/api/v1/tech-skills/areas')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(areasRes.status).toBe(200);
      const areas = areasRes.body.data.areas;
      expect(areas.length).toBeGreaterThan(0);

      // Pick first area and get its niches
      const areaType = areas[0].type || areas[0].areaType || areas[0].slug;
      const nichesRes = await app.request
        .get(`/api/v1/tech-skills/areas/${areaType}/niches`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(nichesRes.status).toBe(200);
      expect(nichesRes.body.data.niches).toBeDefined();
      expect(Array.isArray(nichesRes.body.data.niches)).toBe(true);
    });

    it.serial('should drill down: niche -> skills', async () => {
      // Get niches first
      const nichesRes = await app.request
        .get('/api/v1/tech-skills/niches')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(nichesRes.status).toBe(200);
      const niches = nichesRes.body.data.niches;
      if (niches.length === 0) return;

      // Pick first niche and get its skills
      const nicheSlug = niches[0].slug || niches[0].id;
      const skillsRes = await app.request
        .get(`/api/v1/tech-skills/niches/${nicheSlug}/skills`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(skillsRes.status).toBe(200);
      expect(skillsRes.body.data.skills).toBeDefined();
      expect(Array.isArray(skillsRes.body.data.skills)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Step 2: Search for Specific Skills
  // ---------------------------------------------------------------------------
  describe('Step 2: Search for Specific Skills', () => {
    it.serial('should find skills via combined search', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills/search?q=java')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toBeDefined();
    });

    it.serial('should find skills via skills-specific search', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills/skills/search?q=react')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills).toBeDefined();
    });

    it.serial('should search programming languages', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills/languages/search?q=python')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages).toBeDefined();
    });

    it.serial('should filter skills by type', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills/skills/type/FRAMEWORK')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills).toBeDefined();
      expect(Array.isArray(res.body.data.skills)).toBe(true);
    });

    it.serial('should handle search with no results gracefully', async () => {
      const res = await app.request
        .get('/api/v1/tech-skills/search?q=zzzznotarealskill')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Step 3: Browse Spoken Languages
  // ---------------------------------------------------------------------------
  describe('Step 3: Browse Spoken Languages', () => {
    it.serial('should list all spoken languages', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.languages).toBeDefined();
      expect(Array.isArray(res.body.data.languages)).toBe(true);
      // Expect seeded data: at least 30 languages
      expect(res.body.data.languages.length).toBeGreaterThanOrEqual(30);
    });

    it.serial('should return languages with multilingual names', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);

      const lang = res.body.data.languages.find((l: { code: string }) => l.code === 'pt');
      expect(lang).toBeDefined();
      expect(lang.nameEn).toBe('Portuguese');
      expect(lang.namePtBr).toBe('Português');
      expect(lang.nameEs).toBe('Portugués');
      expect(lang.nativeName).toBe('Português');
    });
  });

  // ---------------------------------------------------------------------------
  // Step 4: Search Spoken Languages
  // ---------------------------------------------------------------------------
  describe('Step 4: Search Spoken Languages', () => {
    it.serial('should search by English name', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/search?q=spanish')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.languages.find((l: { code: string }) => l.code === 'es');
      expect(found).toBeDefined();
    });

    it.serial('should search with partial match', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/search?q=ger')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages.length).toBeGreaterThanOrEqual(1);
    });

    it.serial('should return empty for nonexistent language', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/search?q=klingon')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.languages).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Step 5: Get Language Details
  // ---------------------------------------------------------------------------
  describe('Step 5: Get Language Details', () => {
    it.serial('should get English by code', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/en')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.language).toBeDefined();
      expect(res.body.data.language.code).toBe('en');
      expect(res.body.data.language.nameEn).toBe('English');
      expect(res.body.data.language.nativeName).toBe('English');
    });

    it.serial('should get Japanese by code (non-Latin script)', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/ja')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.language.code).toBe('ja');
      expect(res.body.data.language.nameEn).toBe('Japanese');
      expect(res.body.data.language.nativeName).toBe('日本語');
    });

    it.serial('should get Arabic by code (RTL script)', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/ar')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.language.code).toBe('ar');
      expect(res.body.data.language.nameEn).toBe('Arabic');
      expect(res.body.data.language.nativeName).toBe('العربية');
    });

    it.serial('should return 404 for invalid code', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/xx')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Step 6: Verify Seeded Data Integrity
  // ---------------------------------------------------------------------------
  describe('Step 6: Verify Seeded Data Integrity', () => {
    it.serial('should have all expected spoken language codes', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      const codes = res.body.data.languages.map((l: { code: string }) => l.code);

      // Verify key language codes from the seed file
      const expectedCodes = [
        'en',
        'es',
        'zh',
        'hi',
        'ar',
        'pt',
        'bn',
        'ru',
        'ja',
        'de',
        'fr',
        'it',
        'nl',
        'pl',
        'uk',
        'ro',
        'el',
        'cs',
        'sv',
        'hu',
        'ko',
        'vi',
        'th',
        'id',
        'ms',
        'tl',
        'tr',
        'he',
        'fa',
        'sw',
        'other',
      ];

      for (const code of expectedCodes) {
        expect(codes).toContain(code);
      }
    });

    it.serial('should have consistent data across list and detail endpoints', async () => {
      // Get from list
      const listRes = await app.request
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(listRes.status).toBe(200);
      const enFromList = listRes.body.data.languages.find((l: { code: string }) => l.code === 'en');

      // Get from detail
      const detailRes = await app.request
        .get('/api/v1/spoken-languages/en')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(detailRes.status).toBe(200);
      const enFromDetail = detailRes.body.data.language;

      // Should be consistent
      expect(enFromList.nameEn).toBe(enFromDetail.nameEn);
      expect(enFromList.namePtBr).toBe(enFromDetail.namePtBr);
      expect(enFromList.nameEs).toBe(enFromDetail.nameEs);
      expect(enFromList.code).toBe(enFromDetail.code);
    });

    it.serial('should have tech areas, niches, and skills forming a valid hierarchy', async () => {
      // Get areas
      const areasRes = await app.request
        .get('/api/v1/tech-skills/areas')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(areasRes.status).toBe(200);
      expect(areasRes.body.data.areas.length).toBeGreaterThan(0);

      // Get niches
      const nichesRes = await app.request
        .get('/api/v1/tech-skills/niches')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(nichesRes.status).toBe(200);
      expect(nichesRes.body.data.niches.length).toBeGreaterThan(0);

      // Get skills
      const skillsRes = await app.request
        .get('/api/v1/tech-skills/skills')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(skillsRes.status).toBe(200);
      expect(skillsRes.body.data.skills.length).toBeGreaterThan(0);

      // Hierarchy check: niches count >= areas count (each area has niches)
      expect(nichesRes.body.data.niches.length).toBeGreaterThanOrEqual(
        areasRes.body.data.areas.length,
      );
    });

    it.serial('should have programming languages as a subset of skills catalog', async () => {
      const langRes = await app.request
        .get('/api/v1/tech-skills/languages')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(langRes.status).toBe(200);
      expect(langRes.body.data.languages.length).toBeGreaterThan(0);

      // Languages should be a curated list
      const langNames = langRes.body.data.languages.map((l: { nameEn: string }) =>
        l.nameEn.toLowerCase(),
      );

      // Well-known programming languages should be present
      const wellKnown = ['javascript', 'python', 'typescript', 'java'];
      const foundCount = wellKnown.filter((wk) =>
        langNames.some((n: string) => n.includes(wk)),
      ).length;

      // At least 2 of the well-known languages should exist
      expect(foundCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Authentication boundary
  // ---------------------------------------------------------------------------
  describe('Authentication Boundary', () => {
    it.serial('should reject unauthenticated tech skills request', async () => {
      const res = await app.request.get('/api/v1/tech-skills');

      expect(res.status).toBe(401);
    });

    it.serial('should reject unauthenticated spoken languages request', async () => {
      const res = await app.request.get('/api/v1/spoken-languages');

      expect(res.status).toBe(401);
    });

    it.serial('should reject unauthenticated language detail request', async () => {
      const res = await app.request.get('/api/v1/spoken-languages/en');

      expect(res.status).toBe(401);
    });
  });
});
