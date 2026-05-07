/**
 * E2E Tests: Admin Section Types API
 *
 * Tests the full CRUD lifecycle for section types.
 * Uses seeded admin user for authentication.
 *
 * Flow:
 * 1. Authenticate as admin (seeded user)
 * 2. Test list, get, create, update, delete operations
 * 3. Verify auth boundaries (401/403)
 * 4. Clean up test data
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import type { PrismaClient } from '@prisma/client';
import { stopTestApp, type TestApp } from '../shared';
import { AuthHelper } from '../shared/auth.helper';
import type { CleanupHelper } from './helpers/cleanup.helper';
import { createE2ETestApp } from './setup';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!@#';

describe('E2E: Admin Section Types CRUD', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaClient;
  let adminToken: string;
  let regularUser: { email: string; token?: string };
  const testSectionKey = `e2e_test_section_${Date.now()}_v1`;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;

    // Login as seeded admin
    adminToken = await authHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    // Create regular user for permission boundary tests
    const user = authHelper.createTestUser('section_types_regular');
    const result = await authHelper.registerAndLogin(user);
    regularUser = { email: user.email, token: result.token };
  });

  afterAll(async () => {
    try {
      await prisma.sectionType.deleteMany({
        where: { key: { startsWith: 'e2e_test_section_' } },
      });
    } catch {
      // Already deleted
    }

    if (regularUser?.email) {
      await cleanupHelper.deleteUserByEmail(regularUser.email);
    }

    await stopTestApp();
  });

  // ── Authentication & Authorization ──────────────────────────────────

  describe('Auth Boundaries', () => {
    it.serial('should reject unauthenticated requests', async () => {
      const response = await app.request.get('/api/v1/admin/section-types');

      expect(response.status).toBe(401);
    });

    it.serial('should reject non-admin users', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  // ── List Section Types ──────────────────────────────────────────────

  describe('GET /api/v1/admin/section-types', () => {
    it.serial('should return paginated list of seeded section types', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.page).toBe(1);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.totalPages).toBe('number');
    });

    it.serial('should respect limit parameter', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeLessThanOrEqual(3);
      expect(response.body.limit).toBe(3);
    });

    it.serial('should filter by search term', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types?search=work')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      if (response.body.items.length > 0) {
        const matchesSearch = response.body.items.some(
          (item: { key: string; title: string }) =>
            item.key.includes('work') || item.title.toLowerCase().includes('work'),
        );
        expect(matchesSearch).toBe(true);
      }
    });

    it.serial('should filter by isActive', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      for (const item of response.body.items) {
        expect(item.isActive).toBe(true);
      }
    });

    it.serial('should filter by semanticKind', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types?semanticKind=WORK_EXPERIENCE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      for (const item of response.body.items) {
        expect(item.semanticKind).toBe('WORK_EXPERIENCE');
      }
    });
  });

  // ── Semantic Kinds ──────────────────────────────────────────────────

  describe('GET /api/v1/admin/section-types/semantic-kinds', () => {
    it.serial('should return list of unique semantic kinds', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types/semantic-kinds')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toContain('WORK_EXPERIENCE');
    });
  });

  // ── Get by Key ──────────────────────────────────────────────────────

  describe('GET /api/v1/admin/section-types/:key', () => {
    it.serial('should return section type with translations and icon', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.key).toBe('work_experience_v1');
      expect(response.body.semanticKind).toBe('WORK_EXPERIENCE');
      expect(response.body.isSystem).toBe(true);
      expect(typeof response.body.iconType).toBe('string');
      expect(typeof response.body.icon).toBe('string');
      expect(typeof response.body.translations).toBe('object');
    });

    it.serial('should return 404 for nonexistent key', async () => {
      const response = await app.request
        .get('/api/v1/admin/section-types/nonexistent_v1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ── Create ──────────────────────────────────────────────────────────

  describe('POST /api/v1/admin/section-types', () => {
    it.serial('should create a custom section type with i18n', async () => {
      const payload = {
        key: testSectionKey,
        slug: 'e2e-test-section',
        title: 'E2E Test Section',
        description: 'Created by E2E test',
        semanticKind: 'CUSTOM',
        version: 1,
        isRepeatable: true,
        minItems: 0,
        definition: {
          schemaVersion: 1,
          kind: 'CUSTOM',
          fields: [{ key: 'name', type: 'string', required: true }],
        },
        iconType: 'emoji',
        icon: '🧪',
        translations: {
          en: {
            title: 'E2E Test',
            label: 'test',
            noDataLabel: 'No test data',
            placeholder: 'Add test...',
            addLabel: 'Add Test',
          },
          'pt-BR': {
            title: 'Teste E2E',
            label: 'teste',
            noDataLabel: 'Sem dados de teste',
            placeholder: 'Adicionar teste...',
            addLabel: 'Adicionar Teste',
          },
          es: {
            title: 'Prueba E2E',
            label: 'prueba',
            noDataLabel: 'Sin datos de prueba',
            placeholder: 'Agregar prueba...',
            addLabel: 'Agregar Prueba',
          },
        },
      };

      const response = await app.request
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.key).toBe(testSectionKey);
      expect(response.body.isSystem).toBe(false);
      expect(response.body.iconType).toBe('emoji');
      expect(response.body.icon).toBe('🧪');
      expect(response.body.translations.en.title).toBe('E2E Test');
      expect(response.body.translations['pt-BR'].title).toBe('Teste E2E');
    });

    it.serial('should reject duplicate key', async () => {
      const translation = {
        title: 'Dup',
        label: 'dup',
        noDataLabel: 'no data',
        placeholder: 'add...',
        addLabel: 'Add',
      };
      const response = await app.request
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'work_experience_v1',
          slug: 'duplicate',
          title: 'Duplicate',
          semanticKind: 'TEST',
          definition: {
            schemaVersion: 1,
            kind: 'CUSTOM',
            fields: [{ key: 'name', type: 'string', required: true }],
          },
          translations: { en: translation, 'pt-BR': translation, es: translation },
        });

      expect(response.status).toBe(409);
    });

    it.serial('should validate key format (must be snake_case_vN)', async () => {
      const response = await app.request
        .post('/api/v1/admin/section-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'InvalidKey',
          slug: 'test',
          title: 'Test',
          semanticKind: 'TEST',
          definition: { fields: [] },
        });

      expect(response.status).toBe(400);
    });
  });

  // ── Update ──────────────────────────────────────────────────────────

  describe('PATCH /api/v1/admin/section-types/:key', () => {
    it.serial('should update a custom section type', async () => {
      const response = await app.request
        .patch(`/api/v1/admin/section-types/${testSectionKey}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated E2E Test Section',
          icon: '✅',
          translations: {
            en: {
              title: 'Updated Test',
              label: 'test',
              noDataLabel: 'No test data',
              placeholder: 'Add test...',
              addLabel: 'Add Test',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated E2E Test Section');
      expect(response.body.icon).toBe('✅');
    });

    it.serial('should allow icon/translation updates on system types', async () => {
      const response = await app.request
        .patch('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ icon: '💼' });

      expect(response.status).toBe(200);
      expect(response.body.icon).toBe('💼');
    });

    it.serial('should reject definition changes on system types', async () => {
      const response = await app.request
        .patch('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ definition: { fields: [] } });

      expect(response.status).toBe(400);
    });

    it.serial('should return 404 for nonexistent key', async () => {
      const response = await app.request
        .patch('/api/v1/admin/section-types/nonexistent_v1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  // ── Delete ──────────────────────────────────────────────────────────

  describe('DELETE /api/v1/admin/section-types/:key', () => {
    it.serial('should reject deletion of system types', async () => {
      const response = await app.request
        .delete('/api/v1/admin/section-types/work_experience_v1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    it.serial('should delete a custom section type', async () => {
      const deleteResponse = await app.request
        .delete(`/api/v1/admin/section-types/${testSectionKey}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await app.request
        .get(`/api/v1/admin/section-types/${testSectionKey}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(404);
    });

    it.serial('should return 404 for nonexistent key', async () => {
      const response = await app.request
        .delete('/api/v1/admin/section-types/nonexistent_v1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
