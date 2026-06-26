import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp, unwrapApiData } from './setup';

/**
 * Order-independent resume-sections suite. Each test provisions its own
 * user + resume + a unique custom section type, so it owns its fixture
 * for its lifetime. Bun runs tests inside a `describe` concurrently
 * (1.3+), so any shared `let resumeId/sectionTypeKey/itemId` would race.
 *
 * Note: the section-types discovery route filters `isSystem: true`
 * (excludes the Dredd contract fixture from the add-section picker), so
 * fixtures create their custom type with `isSystem: true` to be visible.
 * The item CRUD path reads the section type straight from Postgres (no
 * in-memory cache involved), so no cache refresh is needed.
 */

interface SectionsFixture {
  readonly user: FreshUser;
  readonly resumeId: string;
  readonly sectionTypeKey: string;
  readonly sectionTypeId: string;
}

/**
 * The section-types discovery presenter resolves the section type's
 * user-facing strings strictly per locale (no fallback) — a custom type
 * served without a translation for the requested locale 500s. Seeded
 * system types carry these, so fixtures mirror the seed shape for both
 * supported locales (`en` + `pt-BR`).
 */
function sectionTypeTranslations(title: string): Prisma.InputJsonValue {
  const en = {
    title,
    description: title,
    label: title,
    noDataLabel: `No ${title} yet`,
    placeholder: `Add ${title}...`,
    addLabel: `Add ${title}`,
  };
  return { en, 'pt-BR': en };
}

async function seedResumeWithSectionType(app: TestApp): Promise<SectionsFixture> {
  const user = await freshInDbUser(app);

  const createResume = await app.request
    .post('/api/v1/resumes')
    .set(user.bearer())
    .send({ title: 'Resume Sections Integration Test' });
  expect(createResume.status).toBe(201);
  const resumeId = unwrapApiData<{ id: string }>(createResume.body).id;

  const sectionTypeKey = `custom_resume_sections_${randomUUID().slice(0, 8)}_v1`;
  const sectionType = await app.prisma.sectionType.create({
    data: {
      key: sectionTypeKey,
      slug: sectionTypeKey,
      title: 'Custom Resume Section',
      description: 'Dynamic section for integration test',
      semanticKind: 'CUSTOM',
      version: 1,
      isActive: true,
      isSystem: true,
      isRepeatable: true,
      minItems: 0,
      maxItems: 3,
      definition: {
        schemaVersion: 1,
        kind: 'CUSTOM',
        fields: [{ key: 'headline', type: 'string', required: true }],
      },
      translations: sectionTypeTranslations('Custom Resume Section'),
    },
  });

  return { user, resumeId, sectionTypeKey, sectionTypeId: sectionType.id };
}

describe('Resume Sections Integration', () => {
  it('lists section types including seeded custom type', async () => {
    const app = await getApp();
    const { user, resumeId, sectionTypeKey } = await seedResumeWithSectionType(app);

    const res = await app.request
      .get(`/api/v1/resumes/${resumeId}/sections/types`)
      .set(user.bearer());

    expect(res.status).toBe(200);
    const sectionTypes = res.body.sectionTypes as Array<{ key: string }>;
    expect(Array.isArray(sectionTypes)).toBe(true);
    expect(sectionTypes.some((item) => item.key === sectionTypeKey)).toBe(true);
  });

  it('creates and lists a section item', async () => {
    const app = await getApp();
    const { user, resumeId, sectionTypeKey } = await seedResumeWithSectionType(app);

    const createRes = await app.request
      .post(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items`)
      .set(user.bearer())
      .send({ content: { headline: 'Built ATS-ready profile sections' } });

    expect([200, 201].includes(createRes.status)).toBe(true);

    const itemId = createRes.body.item.id as string;
    expect(itemId).toBeDefined();

    const listRes = await app.request
      .get(`/api/v1/resumes/${resumeId}/sections`)
      .set(user.bearer());

    expect(listRes.status).toBe(200);

    const sections = listRes.body.sections as Array<{
      sectionType: { key: string };
      items: Array<{ id: string; content: unknown }>;
    }>;

    const targetSection = sections.find((section) => section.sectionType.key === sectionTypeKey);
    expect(targetSection).toBeDefined();
    expect(targetSection?.items.some((item) => item.id === itemId)).toBe(true);
  });

  it('updates and deletes a section item', async () => {
    const app = await getApp();
    const { user, resumeId, sectionTypeKey } = await seedResumeWithSectionType(app);

    const createRes = await app.request
      .post(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items`)
      .set(user.bearer())
      .send({ content: { headline: 'Built ATS-ready profile sections' } });
    expect([200, 201].includes(createRes.status)).toBe(true);
    const itemId = createRes.body.item.id as string;

    const updateRes = await app.request
      .patch(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items/${itemId}`)
      .set(user.bearer())
      .send({ content: { headline: 'Updated headline for dynamic section' } });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.content?.headline).toBe('Updated headline for dynamic section');

    const deleteRes = await app.request
      .delete(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items/${itemId}`)
      .set(user.bearer());

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deleted).toBe(true);
  });

  it('rejects invalid payload for section definition', async () => {
    const app = await getApp();
    const { user, resumeId, sectionTypeKey } = await seedResumeWithSectionType(app);

    const res = await app.request
      .post(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items`)
      .set(user.bearer())
      .send({ content: { wrongField: 'missing required headline' } });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated access', async () => {
    const app = await getApp();
    const { resumeId } = await seedResumeWithSectionType(app);

    const res = await app.request.get(`/api/v1/resumes/${resumeId}/sections`);
    expect(res.status).toBe(401);
  });
});
