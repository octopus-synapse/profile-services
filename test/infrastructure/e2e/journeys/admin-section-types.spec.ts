/**
 * E2E Journey: Admin Section Types
 *
 * Complementary to test/infrastructure/e2e/admin-section-types.e2e.spec.ts
 * which covers basic CRUD. This journey focuses on:
 *
 * 1. Listing seeded section types (verifying expected ones exist)
 * 2. Semantic kinds enumeration
 * 3. Full CRUD lifecycle as a journey
 * 4. Auth boundary: regular user cannot create/update/delete
 * 5. Verify deleted type is truly gone
 * 6. Edge cases: invalid payloads, duplicate keys
 *
 * Target Time: < 30 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!@#';

describe('E2E Journey: Admin Section Types Lifecycle', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaService;
  let adminToken: string;
  let regularUser: {
    email: string;
    token?: string;
    userId?: string;
  };

  const testKey = `e2e_journey_section_${Date.now()}_v1`;
  const testKey2 = `e2e_journey_section2_${Date.now()}_v1`;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;

    // Login as admin
    adminToken = await authHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    // Create regular user
    const user = authHelper.createTestUser('section_journey');
    const result = await authHelper.registerAndLogin(user);
    regularUser = {
      email: user.email,
      token: result.token,
      userId: result.userId,
    };
  });

  afterAll(async () => {
    try {
      // Clean up test section types
      await prisma.sectionType.deleteMany({
        where: {
          key: { startsWith: 'e2e_journey_section' },
        },
      });
    } catch {
      // Already deleted
    }

    if (regularUser?.email) {
      await cleanupHelper.deleteUserByEmail(regularUser.email);
    }
    await app.close();
  });

  // ── Step 1: Verify Seeded Section Types ────────────────────────────

  describe('Step 1: Seeded section types', () => {
    it('should list seeded section types', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.total).toBeGreaterThan(0);

      // Verify expected seeded types exist
      const keys = res.body.data.items.map((item: { key: string }) => item.key);

      // These should be seeded by section-type.seed.ts
      const expectedKeys = ['work_experience_v1', 'education_v1', 'skill_set_v1', 'language_v1'];

      for (const expectedKey of expectedKeys) {
        // Might need to fetch all pages, but most seeded types should be on page 1
        // If not found in first page, check individually
        if (!keys.includes(expectedKey)) {
          const singleRes = await request(app.getHttpServer())
            .get(`/api/v1/admin/section-types/${expectedKey}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(singleRes.status).toBe(200);
          expect(singleRes.body.data.key).toBe(expectedKey);
        }
      }
    });

    it('should get work_experience_v1 with full details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.key).toBe('work_experience_v1');
      expect(res.body.data.semanticKind).toBe('WORK_EXPERIENCE');
      expect(res.body.data.isSystem).toBe(true);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.definition).toBeDefined();
    });
  });

  // ── Step 2: Semantic Kinds ─────────────────────────────────────────

  describe('Step 2: Semantic kinds', () => {
    it('should return all unique semantic kinds', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/section-types/semantic-kinds')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Should include at least these fundamental kinds
      expect(res.body.data).toContain('WORK_EXPERIENCE');
    });
  });

  // ── Step 3: Auth Boundaries ────────────────────────────────────────

  describe('Step 3: Auth boundaries', () => {
    it('should reject unauthenticated list request', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/section-types').expect(401);
    });

    it('should reject regular user listing (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(res.status).toBe(403);
    });

    it('should reject regular user create (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .send({
          key: 'hacker_section_v1',
          slug: 'hacker',
          title: 'Hacker Section',
          semanticKind: 'CUSTOM',
          definition: { fields: [] },
        });

      expect(res.status).toBe(403);
    });

    it('should reject regular user update (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });

    it('should reject regular user delete (403)', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Step 4: Create Custom Section Type ─────────────────────────────

  describe('Step 4: Create custom section type', () => {
    it('should create a new section type with i18n', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey,
          slug: 'e2e-journey-section',
          title: 'E2E Journey Section',
          description: 'Created by journey test',
          semanticKind: 'CUSTOM',
          version: 1,
          isRepeatable: true,
          minItems: 0,
          definition: {
            schemaVersion: 1,
            kind: 'CUSTOM',
            fields: [
              { key: 'title', type: 'string', required: true },
              { key: 'description', type: 'text', required: false },
            ],
          },
          iconType: 'emoji',
          icon: '📋',
          translations: {
            en: {
              title: 'Journey Test Section',
              label: 'journey',
              noDataLabel: 'No journey data',
              placeholder: 'Add journey item...',
              addLabel: 'Add Item',
            },
            'pt-BR': {
              title: 'Secao de Teste de Jornada',
              label: 'jornada',
              noDataLabel: 'Sem dados de jornada',
              placeholder: 'Adicionar item...',
              addLabel: 'Adicionar Item',
            },
            es: {
              title: 'Seccion de Prueba de Viaje',
              label: 'viaje',
              noDataLabel: 'Sin datos de viaje',
              placeholder: 'Agregar item...',
              addLabel: 'Agregar Item',
            },
          },
        })
        .expect(201);

      expect(res.body.data.key).toBe(testKey);
      expect(res.body.data.isSystem).toBe(false);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.iconType).toBe('emoji');
      expect(res.body.data.icon).toBe('📋');
      expect(res.body.data.translations.en.title).toBe('Journey Test Section');
      expect(res.body.data.translations['pt-BR'].title).toBe('Secao de Teste de Jornada');
    });

    it('should reject duplicate key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey,
          slug: 'duplicate',
          title: 'Duplicate',
          semanticKind: 'CUSTOM',
          definition: { fields: [] },
          translations: {
            en: { title: 'Dup', label: 'dup' },
            'pt-BR': { title: 'Dup', label: 'dup' },
            es: { title: 'Dup', label: 'dup' },
          },
        });

      expect(res.status).toBe(409);
    });

    it('should reject invalid key format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'InvalidCamelCase',
          slug: 'invalid',
          title: 'Invalid',
          semanticKind: 'CUSTOM',
          definition: { fields: [] },
        });

      expect(res.status).toBe(400);
    });

    it('should verify created type appears in listing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/section-types/${testKey}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.key).toBe(testKey);
      expect(res.body.data.title).toBe('E2E Journey Section');
    });
  });

  // ── Step 5: Update Section Type ────────────────────────────────────

  describe('Step 5: Update section type', () => {
    it('should update custom section type title and icon', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/section-types/${testKey}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Journey Section',
          icon: '✏️',
          translations: {
            en: {
              title: 'Updated Test',
              label: 'updated',
              noDataLabel: 'No data',
              placeholder: 'Add...',
              addLabel: 'Add',
            },
          },
        })
        .expect(200);

      expect(res.body.data.title).toBe('Updated Journey Section');
      expect(res.body.data.icon).toBe('✏️');
      expect(res.body.data.translations.en.title).toBe('Updated Test');
    });

    it('should reject definition changes on system types', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ definition: { fields: [] } });

      expect(res.status).toBe(400);
    });

    it('should allow icon update on system types', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ icon: '💼' });

      expect(res.status).toBe(200);
      expect(res.body.data.icon).toBe('💼');
    });

    it('should return 404 for nonexistent key', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/section-types/totally_missing_v1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Ghost' })
        .expect(404);
    });
  });

  // ── Step 6: Search and Filter ──────────────────────────────────────

  describe('Step 6: Search and filter', () => {
    it('should search section types by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/section-types?search=journey')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (res.body.data.items.length > 0) {
        const found = res.body.data.items.some(
          (item: { key: string; title: string }) =>
            item.key.includes('journey') || item.title.toLowerCase().includes('journey'),
        );
        expect(found).toBe(true);
      }
    });

    it('should filter by isActive', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/section-types?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const item of res.body.data.items) {
        expect(item.isActive).toBe(true);
      }
    });

    it('should paginate results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/section-types?page=1&pageSize=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.items.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pageSize).toBe(2);
      expect(res.body.data.page).toBe(1);
      expect(typeof res.body.data.total).toBe('number');
    });
  });

  // ── Step 7: Delete and Verify ──────────────────────────────────────

  describe('Step 7: Delete section type', () => {
    it('should create another section type for deletion', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey2,
          slug: 'e2e-journey-delete',
          title: 'Delete Me Section',
          semanticKind: 'CUSTOM',
          definition: { fields: [] },
          translations: {
            en: { title: 'Delete Me', label: 'delete' },
            'pt-BR': { title: 'Delete Me', label: 'delete' },
            es: { title: 'Delete Me', label: 'delete' },
          },
        });

      expect(res.status).toBe(201);
    });

    it('should reject deletion of system types', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should delete custom section type', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/section-types/${testKey2}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should return 404 for deleted section type', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/section-types/${testKey2}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when deleting nonexistent key', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/admin/section-types/ghost_key_v1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should delete the first custom section type (cleanup)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/section-types/${testKey}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/v1/admin/section-types/${testKey}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── Step 8: Edge Cases ─────────────────────────────────────────────

  describe('Step 8: Edge cases', () => {
    it('should handle empty search gracefully', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/section-types?search=')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Empty search should return all items (like no filter)
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    it('should handle missing required fields on create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing key, slug, title, etc.
          description: 'Incomplete',
        });

      expect(res.status).toBe(400);
    });
  });
});
