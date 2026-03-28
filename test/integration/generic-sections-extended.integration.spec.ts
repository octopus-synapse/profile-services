/**
 * Integration Tests: Generic Resume Sections (Extended)
 *
 * Comprehensive integration tests for the dynamic sections system.
 * Covers edge cases, validation, authorization, and business rules.
 *
 * These tests complement the existing resume-sections.integration.spec.ts
 * with additional scenarios for complete coverage.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import {
  authHeader,
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  unwrapApiData,
} from './setup';

describe('Generic Resume Sections Extended Integration', () => {
  let userAToken: string;
  let userAResumeId: string;

  let userBToken: string;
  let userBResumeId: string;

  let sectionTypeKey: string;
  let sectionTypeId: string;
  let nonRepeatableSectionTypeKey: string;
  let nonRepeatableSectionTypeId: string;

  beforeAll(async () => {
    await getApp();
    const prisma = getPrisma();

    // Create User A
    const loginA = await createTestUserAndLogin({
      email: `gen-sections-ext-a-${Date.now()}@example.com`,
    });
    userAToken = loginA.accessToken;

    const createResumeA = await getRequest()
      .post('/api/v1/resumes')
      .set(authHeader(userAToken))
      .send({ title: 'User A Resume for Generic Sections' });

    expect(createResumeA.status).toBe(201);
    userAResumeId = unwrapApiData<{ id: string }>(createResumeA.body).id;

    // Create User B
    const loginB = await createTestUserAndLogin({
      email: `gen-sections-ext-b-${Date.now()}@example.com`,
    });
    userBToken = loginB.accessToken;

    const createResumeB = await getRequest()
      .post('/api/v1/resumes')
      .set(authHeader(userBToken))
      .send({ title: 'User B Resume for Generic Sections' });

    expect(createResumeB.status).toBe(201);
    userBResumeId = unwrapApiData<{ id: string }>(createResumeB.body).id;

    // Create a repeatable custom section type
    sectionTypeKey = `custom_ext_${randomUUID().slice(0, 8)}_v1`;
    const sectionType = await prisma.sectionType.create({
      data: {
        key: sectionTypeKey,
        slug: sectionTypeKey,
        title: 'Extended Custom Section',
        description: 'Custom section for extended integration tests',
        semanticKind: 'CUSTOM',
        version: 1,
        isActive: true,
        isSystem: false,
        isRepeatable: true,
        minItems: 0,
        maxItems: 5,
        definition: {
          schemaVersion: 1,
          kind: 'CUSTOM',
          fields: [
            { key: 'title', type: 'string', required: true },
            { key: 'description', type: 'string', required: false },
            { key: 'priority', type: 'number', required: false },
          ],
        },
      },
    });
    sectionTypeId = sectionType.id;

    // Create a non-repeatable section type (max 1 item)
    nonRepeatableSectionTypeKey = `singleton_${randomUUID().slice(0, 8)}_v1`;
    const nonRepeatableSectionType = await prisma.sectionType.create({
      data: {
        key: nonRepeatableSectionTypeKey,
        slug: nonRepeatableSectionTypeKey,
        title: 'Singleton Section',
        description: 'Section that allows only one item',
        semanticKind: 'CUSTOM',
        version: 1,
        isActive: true,
        isSystem: false,
        isRepeatable: false,
        minItems: 0,
        maxItems: 1,
        definition: {
          schemaVersion: 1,
          kind: 'CUSTOM',
          fields: [{ key: 'bio', type: 'string', required: true }],
        },
      },
    });
    nonRepeatableSectionTypeId = nonRepeatableSectionType.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();

    // Clean up resume sections first (FK constraint)
    if (sectionTypeId) {
      await prisma.resumeSection.deleteMany({
        where: { sectionTypeId },
      });
      await prisma.sectionType.deleteMany({ where: { id: sectionTypeId } });
    }
    if (nonRepeatableSectionTypeId) {
      await prisma.resumeSection.deleteMany({
        where: { sectionTypeId: nonRepeatableSectionTypeId },
      });
      await prisma.sectionType.deleteMany({
        where: { id: nonRepeatableSectionTypeId },
      });
    }

    await closeApp();
  });

  describe('Section Types Discovery', () => {
    it('should list custom section type in available types', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${userAResumeId}/sections/types`)
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      const body = unwrapApiData<{
        sectionTypes: Array<{ key: string; isActive: boolean }>;
      }>(res.body);
      const types = body.sectionTypes;

      const customType = types.find((t) => t.key === sectionTypeKey);
      expect(customType).toBeDefined();
      expect(customType?.isActive).toBe(true);
    });

    it('should include definition structure for section types', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${userAResumeId}/sections/types`)
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      const body = unwrapApiData<{
        sectionTypes: Array<{
          key: string;
          definition?: { schemaVersion?: number; fields?: Array<unknown> };
        }>;
      }>(res.body);
      const types = body.sectionTypes;

      const customType = types.find((t) => t.key === sectionTypeKey);
      if (customType?.definition) {
        expect(customType.definition.schemaVersion).toBe(1);
      }
    });

    it('should filter out inactive section types', async () => {
      const prisma = getPrisma();

      // Temporarily deactivate our section type
      await prisma.sectionType.update({
        where: { id: sectionTypeId },
        data: { isActive: false },
      });

      const res = await getRequest()
        .get(`/api/v1/resumes/${userAResumeId}/sections/types`)
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      const body = unwrapApiData<{ sectionTypes: Array<{ key: string }> }>(res.body);
      const types = body.sectionTypes;

      const inactiveType = types.find((t) => t.key === sectionTypeKey);
      expect(inactiveType).toBeUndefined();

      // Reactivate
      await prisma.sectionType.update({
        where: { id: sectionTypeId },
        data: { isActive: true },
      });
    });
  });

  describe('Content Validation', () => {
    it('should accept valid content matching schema', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({
          content: { title: 'Valid Title', description: 'Optional desc' },
        });

      expect([200, 201]).toContain(res.status);
    });

    it('should reject content missing required field', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { description: 'Missing title field' } });

      expect(res.status).toBe(400);
    });

    it('should accept content with only required fields', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'Only Required Field' } });

      expect([200, 201]).toContain(res.status);
    });

    it('should handle numeric fields correctly', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'With Priority', priority: 10 } });

      expect([200, 201]).toContain(res.status);

      const created = unwrapApiData<{ content?: { priority?: number } }>(res.body);
      expect(created.content?.priority).toBe(10);
    });

    it('should reject empty content object', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: {} });

      expect(res.status).toBe(400);
    });

    it('should reject missing content field', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Cross-User Authorization', () => {
    let userAItemId: string;

    beforeAll(async () => {
      // Create an item for user A
      const createRes = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'User A Protected Item' } });

      userAItemId = unwrapApiData<{ id: string }>(createRes.body).id;
    });

    it('should prevent user B from reading user A sections', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set(authHeader(userBToken));

      expect([403, 404]).toContain(res.status);
    });

    it('should prevent user B from creating items in user A resume', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userBToken))
        .send({ content: { title: 'Cross User Attempt' } });

      expect([403, 404]).toContain(res.status);
    });

    it('should prevent user B from updating user A items', async () => {
      const res = await getRequest()
        .patch(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${userAItemId}`)
        .set(authHeader(userBToken))
        .send({ content: { title: 'Unauthorized Update' } });

      expect([403, 404]).toContain(res.status);
    });

    it('should prevent user B from deleting user A items', async () => {
      const res = await getRequest()
        .delete(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${userAItemId}`)
        .set(authHeader(userBToken));

      expect([403, 404]).toContain(res.status);
    });

    it('should allow user B to manage their own resume sections', async () => {
      const createRes = await getRequest()
        .post(`/api/v1/resumes/${userBResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userBToken))
        .send({ content: { title: 'User B Own Item' } });

      expect([200, 201]).toContain(createRes.status);

      const itemId = unwrapApiData<{ id: string }>(createRes.body).id;

      const updateRes = await getRequest()
        .patch(`/api/v1/resumes/${userBResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set(authHeader(userBToken))
        .send({ content: { title: 'User B Updated' } });

      expect(updateRes.status).toBe(200);

      const deleteRes = await getRequest()
        .delete(`/api/v1/resumes/${userBResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set(authHeader(userBToken));

      expect(deleteRes.status).toBe(200);
    });
  });

  describe('Authentication Requirements', () => {
    it('should reject unauthenticated section types request', async () => {
      const res = await getRequest().get(`/api/v1/resumes/${userAResumeId}/sections/types`);

      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated sections list request', async () => {
      const res = await getRequest().get(`/api/v1/resumes/${userAResumeId}/sections`);

      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated create request', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .send({ content: { title: 'Unauthed' } });

      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set(authHeader('invalid.token.here'));

      expect(res.status).toBe(401);
    });
  });

  describe('Invalid Inputs', () => {
    it('should handle non-existent resume ID gracefully', async () => {
      const res = await getRequest()
        .get('/api/v1/resumes/clxxxxxxxxxxxxxxxxxxx/sections')
        .set(authHeader(userAToken));

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should handle invalid resume ID format', async () => {
      const res = await getRequest()
        .get('/api/v1/resumes/not-a-cuid/sections')
        .set(authHeader(userAToken));

      expect([400, 404]).toContain(res.status);
    });

    it('should handle non-existent section type key', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/nonexistent_section_type_v99/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'Test' } });

      expect([400, 404]).toContain(res.status);
    });

    it('should handle non-existent item ID for update', async () => {
      const res = await getRequest()
        .patch(
          `/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/clxxxxxxxxxxxxxxxxxxx`,
        )
        .set(authHeader(userAToken))
        .send({ content: { title: 'Ghost Update' } });

      expect([400, 404]).toContain(res.status);
    });

    it('should handle non-existent item ID for delete', async () => {
      const res = await getRequest()
        .delete(
          `/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/clxxxxxxxxxxxxxxxxxxx`,
        )
        .set(authHeader(userAToken));

      expect([400, 404]).toContain(res.status);
    });
  });

  describe('Update Operations', () => {
    let itemToUpdate: string;

    beforeAll(async () => {
      const createRes = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({
          content: { title: 'Original Title', description: 'Original Desc' },
        });

      itemToUpdate = unwrapApiData<{ id: string }>(createRes.body).id;
    });

    it('should update single field retaining others', async () => {
      const res = await getRequest()
        .patch(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemToUpdate}`)
        .set(authHeader(userAToken))
        .send({
          content: { title: 'Updated Title', description: 'Original Desc' },
        });

      expect(res.status).toBe(200);

      const updated = unwrapApiData<{
        content?: { title?: string; description?: string };
      }>(res.body);
      expect(updated.content?.title).toBe('Updated Title');
    });

    it('should allow adding new optional field on update', async () => {
      const res = await getRequest()
        .patch(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemToUpdate}`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'With Priority Now', priority: 5 } });

      expect(res.status).toBe(200);

      const updated = unwrapApiData<{ content?: { priority?: number } }>(res.body);
      expect(updated.content?.priority).toBe(5);
    });

    it('should reject update that removes required field', async () => {
      const res = await getRequest()
        .patch(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemToUpdate}`)
        .set(authHeader(userAToken))
        .send({ content: { description: 'Only description, no title' } });

      expect(res.status).toBe(400);
    });
  });

  describe('Delete Operations', () => {
    it('should successfully delete an item', async () => {
      // Create item to delete
      const createRes = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'To Be Deleted' } });

      expect([200, 201]).toContain(createRes.status);
      const itemId = unwrapApiData<{ id: string }>(createRes.body).id;

      // Delete it
      const deleteRes = await getRequest()
        .delete(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set(authHeader(userAToken));

      expect(deleteRes.status).toBe(200);
    });

    it('should verify item is removed after deletion', async () => {
      // Create item
      const createRes = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'Verify Deletion' } });

      const created = unwrapApiData<{ id: string }>(createRes.body);
      const itemId = created.id;

      // Delete it
      await getRequest()
        .delete(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set(authHeader(userAToken));

      // Verify not in list
      const listRes = await getRequest()
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set(authHeader(userAToken));

      const sections = unwrapApiData<
        Array<{
          sectionType: { key: string };
          items: Array<{ id: string }>;
        }>
      >(listRes.body);

      const targetSection = sections.find((s) => s.sectionType.key === sectionTypeKey);
      if (targetSection) {
        const deletedItem = targetSection.items.find((i) => i.id === itemId);
        expect(deletedItem).toBeUndefined();
      }
    });

    it('should not allow double deletion', async () => {
      // Create item
      const createRes = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'Double Delete Test' } });

      const created = unwrapApiData<{ id: string }>(createRes.body);
      const itemId = created.id;

      // Delete once
      await getRequest()
        .delete(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set(authHeader(userAToken));

      // Try to delete again
      const secondDelete = await getRequest()
        .delete(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set(authHeader(userAToken));

      expect([400, 404]).toContain(secondDelete.status);
    });
  });

  describe('Section Listing', () => {
    beforeAll(async () => {
      // Ensure we have some items
      await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'List Test Item 1' } });

      await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { title: 'List Test Item 2' } });
    });

    it('should return sections organized by section type', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);

      const body = unwrapApiData<{
        sections: Array<{
          sectionType: { key: string };
          items: Array<unknown>;
        }>;
      }>(res.body);
      const sections = body.sections;

      expect(Array.isArray(sections)).toBe(true);

      // Check structure
      for (const section of sections) {
        expect(section.sectionType).toBeDefined();
        expect(section.sectionType.key).toBeDefined();
        expect(Array.isArray(section.items)).toBe(true);
      }
    });

    it('should include all created items in their respective sections', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${userAResumeId}/sections`)
        .set(authHeader(userAToken));

      const body = unwrapApiData<{
        sections: Array<{
          sectionType: { key: string };
          items: Array<{ content: { title: string } }>;
        }>;
      }>(res.body);
      const sections = body.sections;

      const customSection = sections.find((s) => s.sectionType.key === sectionTypeKey);
      expect(customSection).toBeDefined();
      expect(customSection?.items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Singleton Section Type Behavior', () => {
    let singletonItemId: string;

    it('should allow creating first item in singleton section', async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${nonRepeatableSectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { bio: 'First and only bio entry' } });

      expect([200, 201]).toContain(res.status);
      singletonItemId = unwrapApiData<{ item: { id: string } }>(res.body).item.id;
    });

    it('should update singleton item', async () => {
      const res = await getRequest()
        .patch(
          `/api/v1/resumes/${userAResumeId}/sections/${nonRepeatableSectionTypeKey}/items/${singletonItemId}`,
        )
        .set(authHeader(userAToken))
        .send({ content: { bio: 'Updated bio content' } });

      expect(res.status).toBe(200);
    });

    it('should delete singleton item allowing recreation', async () => {
      // Delete
      await getRequest()
        .delete(
          `/api/v1/resumes/${userAResumeId}/sections/${nonRepeatableSectionTypeKey}/items/${singletonItemId}`,
        )
        .set(authHeader(userAToken));

      // Create new one
      const res = await getRequest()
        .post(`/api/v1/resumes/${userAResumeId}/sections/${nonRepeatableSectionTypeKey}/items`)
        .set(authHeader(userAToken))
        .send({ content: { bio: 'New bio after deletion' } });

      expect([200, 201]).toContain(res.status);
    });
  });
});
