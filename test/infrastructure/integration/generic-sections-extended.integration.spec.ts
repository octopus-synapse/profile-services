/**
 * Integration Tests: Generic Resume Sections (Extended)
 *
 * Comprehensive integration tests for the dynamic sections system.
 * Covers edge cases, validation, authorization, and business rules.
 *
 * Order-independent: each test provisions its own user(s) + resume(s) +
 * a uniquely-keyed custom section type, so it owns its fixtures for its
 * lifetime. Bun runs tests inside a `describe` concurrently (1.3+), so
 * any shared `let userAToken/sectionTypeKey/itemId` would race.
 *
 * Notes on the product behaviour this suite exercises:
 *  - The section-types discovery route returns the GLOBAL catalog
 *    filtered by `isActive AND isSystem` and runs each row through a
 *    strict per-locale presenter (no fallback). A custom type therefore
 *    only shows up — and only renders without 500 — when it is created
 *    with `isSystem: true` AND carries translations for every supported
 *    locale (`en` + `pt-BR`). Fixtures mirror the seed shape.
 *  - Item CRUD (create/update/delete) resolves the section type straight
 *    from Postgres (`findActiveSectionTypeByKey`, `isActive` only — no
 *    `isSystem` filter, no in-memory cache), so no cache refresh is
 *    needed for those paths and a per-test custom type is immediately
 *    usable.
 */

import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp, unwrapApiData } from './setup';

/** Strict per-locale strings the discovery presenter requires. */
function sectionTypeTranslations(title: string): Prisma.InputJsonValue {
  const entry = {
    title,
    description: title,
    label: title,
    noDataLabel: `No ${title} yet`,
    placeholder: `Add ${title}...`,
    addLabel: `Add ${title}`,
  };
  return { en: entry, 'pt-BR': entry };
}

interface SectionTypeFixture {
  readonly key: string;
  readonly id: string;
}

/** A repeatable custom section type (title/description/priority fields). */
async function createRepeatableType(app: TestApp): Promise<SectionTypeFixture> {
  const key = `custom_ext_${randomUUID().slice(0, 8)}_v1`;
  const row = await app.prisma.sectionType.create({
    data: {
      key,
      slug: key,
      title: 'Extended Custom Section',
      description: 'Custom section for extended integration tests',
      semanticKind: 'CUSTOM',
      version: 1,
      isActive: true,
      isSystem: true,
      isRepeatable: true,
      minItems: 0,
      maxItems: 100,
      definition: {
        schemaVersion: 1,
        kind: 'CUSTOM',
        fields: [
          { key: 'title', type: 'string', required: true },
          { key: 'description', type: 'string', required: false },
          { key: 'priority', type: 'number', required: false },
        ],
      },
      translations: sectionTypeTranslations('Extended Custom Section'),
    },
  });
  return { key, id: row.id };
}

/** A non-repeatable (singleton, maxItems 1) custom section type. */
async function createSingletonType(app: TestApp): Promise<SectionTypeFixture> {
  const key = `singleton_${randomUUID().slice(0, 8)}_v1`;
  const row = await app.prisma.sectionType.create({
    data: {
      key,
      slug: key,
      title: 'Singleton Section',
      description: 'Section that allows only one item',
      semanticKind: 'CUSTOM',
      version: 1,
      isActive: true,
      isSystem: true,
      isRepeatable: false,
      minItems: 0,
      maxItems: 1,
      definition: {
        schemaVersion: 1,
        kind: 'CUSTOM',
        fields: [{ key: 'bio', type: 'string', required: true }],
      },
      translations: sectionTypeTranslations('Singleton Section'),
    },
  });
  return { key, id: row.id };
}

interface UserResume {
  readonly user: FreshUser;
  readonly resumeId: string;
}

/** Provision a fresh user + a resume owned by them. */
async function freshUserWithResume(app: TestApp, title: string): Promise<UserResume> {
  const user = await freshInDbUser(app);
  const res = await app.request.post('/api/v1/resumes').set(user.bearer()).send({ title });
  expect(res.status).toBe(201);
  return { user, resumeId: unwrapApiData<{ id: string }>(res.body).id };
}

/** Create a section item via the API and return its id. */
async function createItem(
  app: TestApp,
  owner: UserResume,
  typeKey: string,
  content: Record<string, unknown>,
): Promise<string> {
  const res = await app.request
    .post(`/api/v1/resumes/${owner.resumeId}/sections/${typeKey}/items`)
    .set(owner.user.bearer())
    .send({ content });
  expect([200, 201]).toContain(res.status);
  return res.body.item.id as string;
}

describe('Generic Resume Sections Extended Integration', () => {
  describe('Section Types Discovery', () => {
    it('should list custom section type in available types', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Disc Resume A');
      const type = await createRepeatableType(app);

      const res = await app.request
        .get(`/api/v1/resumes/${owner.resumeId}/sections/types`)
        .set(owner.user.bearer());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sectionTypes');
      const types = res.body.sectionTypes as Array<{ key: string; isActive: boolean }>;

      const customType = types.find((t) => t.key === type.key);
      expect(customType).toBeDefined();
      expect(customType?.isActive).toBe(true);
    });

    it('should include definition structure for section types', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Disc Resume B');
      const type = await createRepeatableType(app);

      const res = await app.request
        .get(`/api/v1/resumes/${owner.resumeId}/sections/types`)
        .set(owner.user.bearer());

      expect(res.status).toBe(200);
      const types = res.body.sectionTypes as Array<{
        key: string;
        definition?: { schemaVersion?: number; fields?: Array<unknown> };
      }>;

      const customType = types.find((t) => t.key === type.key);
      if (customType?.definition) {
        expect(customType.definition.schemaVersion).toBe(1);
      }
    });

    it('should filter out inactive section types', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Disc Resume C');
      const type = await createRepeatableType(app);

      // Deactivate our own section type — it should disappear from the list.
      await app.prisma.sectionType.update({
        where: { id: type.id },
        data: { isActive: false },
      });

      const res = await app.request
        .get(`/api/v1/resumes/${owner.resumeId}/sections/types`)
        .set(owner.user.bearer());

      expect(res.status).toBe(200);
      const types = res.body.sectionTypes as Array<{ key: string }>;

      const inactiveType = types.find((t) => t.key === type.key);
      expect(inactiveType).toBeUndefined();
    });
  });

  describe('Content Validation', () => {
    it('should accept valid content matching schema', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Valid Content Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .set(owner.user.bearer())
        .send({ content: { title: 'Valid Title', description: 'Optional desc' } });

      expect([200, 201]).toContain(res.status);
    });

    it('should reject content missing required field', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Missing Field Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .set(owner.user.bearer())
        .send({ content: { description: 'Missing title field' } });

      expect(res.status).toBe(400);
    });

    it('should accept content with only required fields', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Only Required Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .set(owner.user.bearer())
        .send({ content: { title: 'Only Required Field' } });

      expect([200, 201]).toContain(res.status);
    });

    it('should handle numeric fields correctly', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Numeric Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .set(owner.user.bearer())
        .send({ content: { title: 'With Priority', priority: 10 } });

      expect([200, 201]).toContain(res.status);
      expect(res.body.item.content?.priority).toBe(10);
    });

    it('should reject empty content object', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Empty Content Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .set(owner.user.bearer())
        .send({ content: {} });

      expect(res.status).toBe(400);
    });

    it('should reject missing content field', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'No Content Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .set(owner.user.bearer())
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Cross-User Authorization', () => {
    it('should prevent user B from reading user A sections', async () => {
      const app = await getApp();
      const a = await freshUserWithResume(app, 'A Read Resume');
      const b = await freshUserWithResume(app, 'B Read Resume');

      const res = await app.request
        .get(`/api/v1/resumes/${a.resumeId}/sections`)
        .set(b.user.bearer());

      expect([403, 404]).toContain(res.status);
    });

    it('should prevent user B from creating items in user A resume', async () => {
      const app = await getApp();
      const a = await freshUserWithResume(app, 'A Create Resume');
      const b = await freshUserWithResume(app, 'B Create Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${a.resumeId}/sections/${type.key}/items`)
        .set(b.user.bearer())
        .send({ content: { title: 'Cross User Attempt' } });

      expect([403, 404]).toContain(res.status);
    });

    it('should prevent user B from updating user A items', async () => {
      const app = await getApp();
      const a = await freshUserWithResume(app, 'A Update Resume');
      const b = await freshUserWithResume(app, 'B Update Resume');
      const type = await createRepeatableType(app);
      const itemId = await createItem(app, a, type.key, { title: 'User A Protected Item' });

      const res = await app.request
        .patch(`/api/v1/resumes/${a.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(b.user.bearer())
        .send({ content: { title: 'Unauthorized Update' } });

      expect([403, 404]).toContain(res.status);
    });

    it('should prevent user B from deleting user A items', async () => {
      const app = await getApp();
      const a = await freshUserWithResume(app, 'A Delete Resume');
      const b = await freshUserWithResume(app, 'B Delete Resume');
      const type = await createRepeatableType(app);
      const itemId = await createItem(app, a, type.key, { title: 'User A Protected Item' });

      const res = await app.request
        .delete(`/api/v1/resumes/${a.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(b.user.bearer());

      expect([403, 404]).toContain(res.status);
    });

    it('should allow user B to manage their own resume sections', async () => {
      const app = await getApp();
      const b = await freshUserWithResume(app, 'B Own Resume');
      const type = await createRepeatableType(app);

      const itemId = await createItem(app, b, type.key, { title: 'User B Own Item' });

      const updateRes = await app.request
        .patch(`/api/v1/resumes/${b.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(b.user.bearer())
        .send({ content: { title: 'User B Updated' } });

      expect(updateRes.status).toBe(200);

      const deleteRes = await app.request
        .delete(`/api/v1/resumes/${b.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(b.user.bearer());

      expect(deleteRes.status).toBe(200);
    });
  });

  describe('Authentication Requirements', () => {
    it('should reject unauthenticated section types request', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Auth Types Resume');

      const res = await app.request.get(`/api/v1/resumes/${owner.resumeId}/sections/types`);
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated sections list request', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Auth List Resume');

      const res = await app.request.get(`/api/v1/resumes/${owner.resumeId}/sections`);
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated create request', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Auth Create Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .send({ content: { title: 'Unauthed' } });

      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Auth Invalid Resume');

      const res = await app.request
        .get(`/api/v1/resumes/${owner.resumeId}/sections`)
        .set({ Authorization: 'Bearer invalid.token.here' });

      expect(res.status).toBe(401);
    });
  });

  describe('Invalid Inputs', () => {
    it('should handle non-existent resume ID gracefully', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);

      const res = await app.request
        .get('/api/v1/resumes/clxxxxxxxxxxxxxxxxxxx/sections')
        .set(user.bearer());

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should handle invalid resume ID format', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);

      const res = await app.request.get('/api/v1/resumes/not-a-cuid/sections').set(user.bearer());

      expect([400, 404]).toContain(res.status);
    });

    it('should handle non-existent section type key', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Bad Type Resume');

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/nonexistent_section_type_v99/items`)
        .set(owner.user.bearer())
        .send({ content: { title: 'Test' } });

      expect([400, 404]).toContain(res.status);
    });

    it('should handle non-existent item ID for update', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Ghost Update Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .patch(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/clxxxxxxxxxxxxxxxxxxx`)
        .set(owner.user.bearer())
        .send({ content: { title: 'Ghost Update' } });

      expect([400, 404]).toContain(res.status);
    });

    it('should handle non-existent item ID for delete', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Ghost Delete Resume');
      const type = await createRepeatableType(app);

      const res = await app.request
        .delete(
          `/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/clxxxxxxxxxxxxxxxxxxx`,
        )
        .set(owner.user.bearer());

      expect([400, 404]).toContain(res.status);
    });
  });

  describe('Update Operations', () => {
    it('should update single field retaining others', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Update Single Resume');
      const type = await createRepeatableType(app);
      const itemId = await createItem(app, owner, type.key, {
        title: 'Original Title',
        description: 'Original Desc',
      });

      const res = await app.request
        .patch(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer())
        .send({ content: { title: 'Updated Title', description: 'Original Desc' } });

      expect(res.status).toBe(200);
      expect(res.body.item.content?.title).toBe('Updated Title');
    });

    it('should allow adding new optional field on update', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Update Optional Resume');
      const type = await createRepeatableType(app);
      const itemId = await createItem(app, owner, type.key, {
        title: 'Original Title',
        description: 'Original Desc',
      });

      const res = await app.request
        .patch(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer())
        .send({ content: { title: 'With Priority Now', priority: 5 } });

      expect(res.status).toBe(200);
      expect(res.body.item.content?.priority).toBe(5);
    });

    it('should reject update that removes required field', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Update Reject Resume');
      const type = await createRepeatableType(app);
      const itemId = await createItem(app, owner, type.key, {
        title: 'Original Title',
        description: 'Original Desc',
      });

      const res = await app.request
        .patch(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer())
        .send({ content: { description: 'Only description, no title' } });

      expect(res.status).toBe(400);
    });
  });

  describe('Delete Operations', () => {
    it('should successfully delete an item', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Delete Item Resume');
      const type = await createRepeatableType(app);
      const itemId = await createItem(app, owner, type.key, { title: 'To Be Deleted' });

      const deleteRes = await app.request
        .delete(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer());

      expect(deleteRes.status).toBe(200);
    });

    it('should verify item is removed after deletion', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Verify Delete Resume');
      const type = await createRepeatableType(app);
      const itemId = await createItem(app, owner, type.key, { title: 'Verify Deletion' });

      await app.request
        .delete(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer());

      const listRes = await app.request
        .get(`/api/v1/resumes/${owner.resumeId}/sections`)
        .set(owner.user.bearer());

      const sections = listRes.body.sections as Array<{
        sectionType: { key: string };
        items: Array<{ id: string }>;
      }>;

      const targetSection = sections.find((s) => s.sectionType.key === type.key);
      if (targetSection) {
        const deletedItem = targetSection.items.find((i) => i.id === itemId);
        expect(deletedItem).toBeUndefined();
      }
    });

    it('should not allow double deletion', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Double Delete Resume');
      const type = await createRepeatableType(app);
      const itemId = await createItem(app, owner, type.key, { title: 'Double Delete Test' });

      await app.request
        .delete(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer());

      const secondDelete = await app.request
        .delete(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer());

      expect([400, 404]).toContain(secondDelete.status);
    });
  });

  describe('Section Listing', () => {
    it('should return sections organized by section type', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'List Org Resume');
      const type = await createRepeatableType(app);
      await createItem(app, owner, type.key, { title: 'List Test Item 1' });
      await createItem(app, owner, type.key, { title: 'List Test Item 2' });

      const res = await app.request
        .get(`/api/v1/resumes/${owner.resumeId}/sections`)
        .set(owner.user.bearer());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sections');

      const sections = res.body.sections as Array<{
        sectionType: { key: string };
        items: Array<unknown>;
      }>;

      expect(Array.isArray(sections)).toBe(true);

      for (const section of sections) {
        expect(section.sectionType).toBeDefined();
        expect(section.sectionType.key).toBeDefined();
        expect(Array.isArray(section.items)).toBe(true);
      }
    });

    it('should include all created items in their respective sections', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'List All Resume');
      const type = await createRepeatableType(app);
      await createItem(app, owner, type.key, { title: 'List Test Item 1' });
      await createItem(app, owner, type.key, { title: 'List Test Item 2' });

      const res = await app.request
        .get(`/api/v1/resumes/${owner.resumeId}/sections`)
        .set(owner.user.bearer());

      const sections = res.body.sections as Array<{
        sectionType: { key: string };
        items: Array<{ content: { title: string } }>;
      }>;

      const customSection = sections.find((s) => s.sectionType.key === type.key);
      expect(customSection).toBeDefined();
      expect(customSection?.items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Singleton Section Type Behavior', () => {
    it('should allow creating first item in singleton section', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Singleton First Resume');
      const type = await createSingletonType(app);

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .set(owner.user.bearer())
        .send({ content: { bio: 'First and only bio entry' } });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('item');
    });

    it('should update singleton item', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Singleton Update Resume');
      const type = await createSingletonType(app);
      const itemId = await createItem(app, owner, type.key, { bio: 'First and only bio entry' });

      const res = await app.request
        .patch(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer())
        .send({ content: { bio: 'Updated bio content' } });

      expect(res.status).toBe(200);
    });

    it('should delete singleton item allowing recreation', async () => {
      const app = await getApp();
      const owner = await freshUserWithResume(app, 'Singleton Recreate Resume');
      const type = await createSingletonType(app);
      const itemId = await createItem(app, owner, type.key, { bio: 'First and only bio entry' });

      await app.request
        .delete(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items/${itemId}`)
        .set(owner.user.bearer());

      const res = await app.request
        .post(`/api/v1/resumes/${owner.resumeId}/sections/${type.key}/items`)
        .set(owner.user.bearer())
        .send({ content: { bio: 'New bio after deletion' } });

      expect([200, 201]).toContain(res.status);
    });
  });
});
