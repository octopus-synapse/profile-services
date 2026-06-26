/**
 * E2E Journey: Generic Resume Sections CRUD Operations
 *
 * Comprehensive tests for dynamic resume sections system.
 * Tests the full lifecycle of section types and items with:
 * - Section type discovery and filtering
 * - Section item CRUD (Create, Read, Update, Delete)
 * - Cross-user access prevention (authorization)
 * - Content validation by section schema
 *
 * Target Time: < 45 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Generic Resume Sections', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaClient;

  // Primary test user
  let userA: { email: string; password: string; name: string; token?: string; userId?: string };
  let userAResumeId: string;

  // Secondary user for cross-user tests
  let userB: { email: string; password: string; name: string; token?: string; userId?: string };
  let userBResumeId: string;

  // Custom section type created for this test
  let sectionTypeKey: string;
  let sectionTypeId: string;

  // Created item IDs for tracking
  let itemId: string;
  let secondItemId: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;

    // Create a custom section type for predictable testing
    sectionTypeKey = `e2e_custom_${randomUUID().slice(0, 8)}_v1`;
    const sectionType = await prisma.sectionType.create({
      data: {
        key: sectionTypeKey,
        slug: sectionTypeKey,
        title: 'E2E Custom Section',
        description: 'Custom section for E2E tests',
        semanticKind: 'CUSTOM',
        version: 1,
        isActive: true,
        // The section-types discovery route returns the GLOBAL catalog
        // filtered by `isSystem: true` and renders each row through a strict
        // per-locale presenter (no fallback), so a discoverable type must be
        // `isSystem: true` AND carry translations for every supported locale.
        isSystem: true,
        isRepeatable: true,
        minItems: 0,
        maxItems: 10,
        definition: {
          schemaVersion: 1,
          kind: 'CUSTOM',
          fields: [
            { key: 'title', type: 'string', required: true },
            { key: 'description', type: 'string', required: false },
          ],
        },
        translations: (() => {
          const entry = {
            title: 'E2E Custom Section',
            description: 'Custom section for E2E tests',
            label: 'E2E Custom Section',
            noDataLabel: 'No E2E Custom Section yet',
            placeholder: 'Add E2E Custom Section...',
            addLabel: 'Add E2E Custom Section',
          };
          return { en: entry, 'pt-BR': entry };
        })(),
      },
    });
    sectionTypeId = sectionType.id;
  });

  afterAll(async () => {
    // Cleanup test users first (which will cascade delete their resumes and items)
    if (userA?.email) {
      await cleanupHelper.deleteUserByEmail(userA.email);
    }
    if (userB?.email) {
      await cleanupHelper.deleteUserByEmail(userB.email);
    }

    // Clean up any orphaned resume sections referencing our section type
    if (sectionTypeId) {
      await prisma.resumeSection.deleteMany({
        where: { sectionTypeId },
      });
      await prisma.sectionType.deleteMany({ where: { id: sectionTypeId } });
    }

    await stopTestApp();
  });

  describe('Setup: Create Test Users and Resumes', () => {
    it.serial('should create and authenticate user A with resume', async () => {
      userA = authHelper.createTestUser('gen-sections-a');

      // Register and login
      const result = await authHelper.registerAndLogin(userA);
      userA.token = result.token;
      userA.userId = result.userId;

      expect(userA.token).toBeDefined();
      expect(userA.userId).toBeDefined();

      // Create resume directly
      const resumeResponse = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ title: 'User A Resume for Generic Sections Test' });

      expect(resumeResponse.status).toBe(201);
      expect(resumeResponse.body.id).toBeDefined();

      userAResumeId = resumeResponse.body.id;
    });

    it.serial('should create and authenticate user B with resume', async () => {
      userB = authHelper.createTestUser('gen-sections-b');

      // Register and login
      const result = await authHelper.registerAndLogin(userB);
      userB.token = result.token;
      userB.userId = result.userId;

      expect(userB.token).toBeDefined();
      expect(userB.userId).toBeDefined();

      // Create resume directly
      const resumeResponse = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ title: 'User B Resume for Generic Sections Test' });

      expect(resumeResponse.status).toBe(201);
      expect(resumeResponse.body.id).toBeDefined();

      userBResumeId = resumeResponse.body.id;
    });
  });

  describe('Section Types Discovery', () => {
    it.serial('should list all active section types including custom', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${userAResumeId}/sections/types`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.sectionTypes)).toBe(true);
      expect(response.body.sectionTypes.length).toBeGreaterThan(0);

      // Our custom section type should be in the list
      const customType = response.body.sectionTypes.find(
        (t: { key: string }) => t.key === sectionTypeKey,
      );
      expect(customType).toBeDefined();
      expect(customType.isActive).toBe(true);
    });

    it.serial('should include required structure for each section type', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${userAResumeId}/sections/types`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);

      const sectionTypes = response.body.sectionTypes;

      // Validate structure of each section type
      for (const sectionType of sectionTypes) {
        expect(sectionType.key).toBeDefined();
        expect(typeof sectionType.key).toBe('string');
        expect(sectionType.isActive).toBe(true);
      }
    });

    it.serial('should require authentication to list section types', async () => {
      const response = await app.request.get(`/api/v1/resumes/${userAResumeId}/sections/types`);

      expect(response.status).toBe(401);
    });
  });

  describe('List Resume Sections', () => {
    it.serial('should list sections for a resume (initially empty)', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.sections)).toBe(true);
    });

    it.serial('should require authentication to list sections', async () => {
      const response = await app.request.get(`/api/v1/resumes/${userAResumeId}/sections`);

      expect(response.status).toBe(401);
    });

    it.serial('should prevent user B from listing user A sections', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Create Section Items', () => {
    it.serial('should create a section item', async () => {
      const payload = {
        content: { title: 'First Item Title', description: 'First item description' },
      };

      const response = await app.request
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.item).toBeDefined();
      expect(response.body.item.id).toBeDefined();
      expect(response.body.item.content.title).toBe('First Item Title');

      itemId = response.body.item.id;
    });

    it.serial('should create multiple items in the same section', async () => {
      const payload = {
        content: { title: 'Second Item Title', description: 'Second item description' },
      };

      const response = await app.request
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.item.id).toBeDefined();

      secondItemId = response.body.item.id;
    });

    it.serial('should require authentication to create items', async () => {
      const payload = {
        content: { title: 'Unauthorized Item' },
      };

      const response = await app.request
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .send(payload);

      expect(response.status).toBe(401);
    });

    it.serial('should prevent user B from creating items in user A resume', async () => {
      const payload = {
        content: { title: 'Cross User Item' },
      };

      const response = await app.request
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send(payload);

      expect([403, 404]).toContain(response.status);
    });

    it.serial('should reject invalid section type key', async () => {
      const payload = {
        content: { title: 'Test' },
      };

      const response = await app.request
        .post(`/api/v1/resumes/${userAResumeId}/sections/invalid_section_key_xyz/items`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(payload);

      expect([400, 404]).toContain(response.status);
    });

    it.serial('should reject content missing required field', async () => {
      const payload = {
        content: { description: 'Missing title field' },
      };

      const response = await app.request
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('Verify Created Items in Section List', () => {
    it.serial('should list created items when getting resume sections', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      const sections = response.body.sections;
      expect(Array.isArray(sections)).toBe(true);

      // Find our custom section
      const customSection = sections.find(
        (s: { sectionType?: { key: string } }) => s.sectionType?.key === sectionTypeKey,
      );

      expect(customSection).toBeDefined();
      expect(Array.isArray(customSection.items)).toBe(true);
      expect(customSection.items.length).toBeGreaterThanOrEqual(2);

      // Verify our created items are present
      const firstItem = customSection.items.find((i: { id: string }) => i.id === itemId);
      expect(firstItem).toBeDefined();
      expect(firstItem.content.title).toBe('First Item Title');
    });
  });

  describe('Update Section Items', () => {
    it.serial('should update a section item', async () => {
      const payload = {
        content: { title: 'Updated Item Title', description: 'Updated description' },
      };

      const response = await app.request
        .patch(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.item.content.title).toBe('Updated Item Title');
      expect(response.body.item.content.description).toBe('Updated description');
    });

    it.serial('should require authentication to update items', async () => {
      const payload = {
        content: { title: 'Unauthorized Update' },
      };

      const response = await app.request
        .patch(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .send(payload);

      expect(response.status).toBe(401);
    });

    it.serial('should prevent user B from updating user A items', async () => {
      const payload = {
        content: { title: 'Cross User Update' },
      };

      const response = await app.request
        .patch(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send(payload);

      expect([403, 404]).toContain(response.status);
    });

    it.serial('should return error for non-existent item ID', async () => {
      const payload = {
        content: { title: 'Ghost Item' },
      };

      const response = await app.request
        .patch(
          `/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/clxxxxxxxxxxxxxxxxxxx`,
        )
        .set('Authorization', `Bearer ${userA.token}`)
        .send(payload);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Delete Section Items', () => {
    it.serial('should delete a section item', async () => {
      const response = await app.request
        .delete(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${secondItemId}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
    });

    it.serial('should verify item is deleted from sections list', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set('Authorization', `Bearer ${userA.token}`);

      const sections = response.body.sections;
      const customSection = sections.find(
        (s: { sectionType?: { key: string } }) => s.sectionType?.key === sectionTypeKey,
      );

      if (customSection) {
        const deletedItem = customSection.items.find((i: { id: string }) => i.id === secondItemId);
        expect(deletedItem).toBeUndefined();
      }
    });

    it.serial('should require authentication to delete items', async () => {
      const response = await app.request.delete(
        `/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`,
      );

      expect(response.status).toBe(401);
    });

    it.serial('should prevent user B from deleting user A items', async () => {
      const response = await app.request
        .delete(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect([403, 404]).toContain(response.status);
    });

    it.serial('should return error for non-existent item ID', async () => {
      const response = await app.request
        .delete(
          `/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/clxxxxxxxxxxxxxxxxxxx`,
        )
        .set('Authorization', `Bearer ${userA.token}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('User B Section Operations (Isolation)', () => {
    it.serial('should allow user B to create items in their own resume', async () => {
      const payload = {
        content: { title: 'User B Item', description: 'User B description' },
      };

      const response = await app.request
        .post(`/api/v1/resumes/${userBResumeId}/sections/${sectionTypeKey}/items`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.item.content.title).toBe('User B Item');
    });

    it.serial('should not show user A items in user B section list', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${userBResumeId}/sections`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(response.status).toBe(200);

      const sections = response.body.sections;
      const customSection = sections.find(
        (s: { sectionType?: { key: string } }) => s.sectionType?.key === sectionTypeKey,
      );

      if (customSection) {
        // Should only contain user B's items, not user A's
        const userAItem = customSection.items.find(
          (i: { content?: { title?: string } }) => i.content?.title === 'Updated Item Title',
        );
        expect(userAItem).toBeUndefined();

        const userBItem = customSection.items.find(
          (i: { content?: { title?: string } }) => i.content?.title === 'User B Item',
        );
        expect(userBItem).toBeDefined();
      }
    });
  });

  describe('Cleanup: Delete Remaining Items', () => {
    it.serial('should delete remaining item from user A', async () => {
      const response = await app.request
        .delete(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
    });
  });
});
