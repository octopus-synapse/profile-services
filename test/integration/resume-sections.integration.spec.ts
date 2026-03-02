import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'crypto';
import {
  authHeader,
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
} from './setup';

type ApiResponse<T> = { data?: T } & T;

function unwrapData<T>(body: ApiResponse<T>): T {
  return (body.data ?? body) as T;
}

describe('Resume Sections Integration', () => {
  let accessToken: string;
  let resumeId: string;
  let sectionTypeKey: string;
  let sectionTypeId: string;
  let itemId: string;

  beforeAll(async () => {
    await getApp();

    const login = await createTestUserAndLogin();
    accessToken = login.accessToken;

    const createResume = await getRequest()
      .post('/api/v1/resumes')
      .set(authHeader(accessToken))
      .send({ title: 'Resume Sections Integration Test' });

    expect(createResume.status).toBe(201);
    resumeId = unwrapData<{ id: string }>(createResume.body).id;

    const prisma = getPrisma();
    sectionTypeKey = `custom_resume_sections_${randomUUID().slice(0, 8)}_v1`;

    const sectionType = await prisma.sectionType.create({
      data: {
        key: sectionTypeKey,
        slug: sectionTypeKey,
        title: 'Custom Resume Section',
        description: 'Dynamic section for integration test',
        semanticKind: 'CUSTOM',
        version: 1,
        isActive: true,
        isSystem: false,
        isRepeatable: true,
        minItems: 0,
        maxItems: 3,
        definition: {
          schemaVersion: 1,
          kind: 'CUSTOM',
          fields: [{ key: 'headline', type: 'string', required: true }],
        },
      },
    });

    sectionTypeId = sectionType.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();

    if (sectionTypeId) {
      await prisma.sectionType.deleteMany({ where: { id: sectionTypeId } });
    }

    await closeApp();
  });

  it('lists section types including seeded custom type', async () => {
    const res = await getRequest()
      .get(`/api/v1/resumes/${resumeId}/sections/types`)
      .set(authHeader(accessToken));

    expect(res.status).toBe(200);
    const list = unwrapData<Array<{ key: string }>>(res.body);
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((item) => item.key === sectionTypeKey)).toBe(true);
  });

  it('creates and lists a section item', async () => {
    const createRes = await getRequest()
      .post(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items`)
      .set(authHeader(accessToken))
      .send({ content: { headline: 'Built ATS-ready profile sections' } });

    expect([200, 201].includes(createRes.status)).toBe(true);

    const created = unwrapData<{ id: string }>(createRes.body);
    itemId = created.id;
    expect(itemId).toBeDefined();

    const listRes = await getRequest()
      .get(`/api/v1/resumes/${resumeId}/sections`)
      .set(authHeader(accessToken));

    expect(listRes.status).toBe(200);

    const sections = unwrapData<
      Array<{ sectionType: { key: string }; items: Array<{ id: string; content: unknown }> }>
    >(listRes.body);

    const targetSection = sections.find((section) => section.sectionType.key === sectionTypeKey);
    expect(targetSection).toBeDefined();
    expect(targetSection?.items.some((item) => item.id === itemId)).toBe(true);
  });

  it('updates and deletes a section item', async () => {
    const updateRes = await getRequest()
      .patch(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items/${itemId}`)
      .set(authHeader(accessToken))
      .send({ content: { headline: 'Updated headline for dynamic section' } });

    expect(updateRes.status).toBe(200);

    const updated = unwrapData<{ content?: { headline?: string } }>(updateRes.body);
    expect(updated.content?.headline).toBe('Updated headline for dynamic section');

    const deleteRes = await getRequest()
      .delete(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items/${itemId}`)
      .set(authHeader(accessToken));

    expect(deleteRes.status).toBe(200);

    const deleted = unwrapData<{ success?: boolean }>(deleteRes.body);
    expect(deleted.success ?? true).toBe(true);
  });

  it('rejects invalid payload for section definition', async () => {
    const res = await getRequest()
      .post(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items`)
      .set(authHeader(accessToken))
      .send({ content: { wrongField: 'missing required headline' } });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated access', async () => {
    const res = await getRequest().get(`/api/v1/resumes/${resumeId}/sections`);
    expect(res.status).toBe(401);
  });
});
