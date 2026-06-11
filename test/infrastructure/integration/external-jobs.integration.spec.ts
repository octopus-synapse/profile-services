/**
 * GET /v1/jobs/external — read route over locally ingested JSearch
 * listings. Rows are seeded straight into Postgres: the worker/adapter
 * are deliberately NOT exercised (no upstream call, no quota spend).
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { closeApp, createTestUserAndLogin, getApp, getPrisma, getRequest } from './setup';

const FETCHED_AT = new Date('2026-06-10T09:00:00.000Z');
const SEED = [
  {
    externalId: 'it-ext-a',
    dedupHash: 'dev backend senior|acme ltda',
    title: 'Dev Backend Sênior',
    company: 'Acme Ltda',
    location: 'São Paulo, SP',
    isRemote: false,
    employmentType: 'FULL_TIME' as const,
    applyUrl: 'https://example.com/a',
    publisher: 'Indeed',
    description: 'Vaga backend.',
    postedAt: new Date('2026-06-09T12:00:00.000Z'),
    fetchedAt: FETCHED_AT,
    sourceQuery: 'desenvolvedor',
    raw: {},
  },
  {
    externalId: 'it-ext-b',
    dedupHash: 'qa remoto|beta sa',
    title: 'QA Remoto',
    company: 'Beta SA',
    location: 'Qualquer lugar',
    isRemote: true,
    employmentType: 'CONTRACT' as const,
    applyUrl: 'https://example.com/b',
    publisher: 'LinkedIn',
    description: null,
    postedAt: null,
    fetchedAt: FETCHED_AT,
    sourceQuery: 'qa',
    raw: { job_publisher: 'LinkedIn' },
  },
  {
    externalId: 'it-ext-c',
    dedupHash: 'estagio mobile|gamma',
    title: 'Estágio Mobile',
    company: 'Gamma',
    location: 'Curitiba, PR',
    isRemote: false,
    employmentType: 'INTERNSHIP' as const,
    applyUrl: 'https://example.com/c',
    publisher: 'Catho',
    description: 'Estágio.',
    postedAt: new Date('2026-06-10T08:00:00.000Z'),
    fetchedAt: FETCHED_AT,
    sourceQuery: 'desenvolvedor mobile',
    raw: {},
  },
];

describe('GET /v1/jobs/external', () => {
  let token: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin();
    token = auth.accessToken;

    const prisma = getPrisma();
    await prisma.externalJobListing.deleteMany({
      where: { externalId: { in: SEED.map((s) => s.externalId) } },
    });
    await prisma.externalJobListing.createMany({ data: SEED });
  });

  afterAll(async () => {
    await getPrisma().externalJobListing.deleteMany({
      where: { externalId: { in: SEED.map((s) => s.externalId) } },
    });
    await closeApp();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await getRequest().get('/api/v1/jobs/external');
    expect(res.status).toBe(401);
  });

  it('returns the canonical paginated envelope, newest postedAt first', async () => {
    const res = await getRequest()
      .get('/api/v1/jobs/external?limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(res.body.items.length).toBe(2);
    expect(res.body).toHaveProperty('totalPages');
    expect(res.body).toHaveProperty('hasNext');
    expect(res.body).toHaveProperty('hasPrev');

    // Seeded rows order by postedAt desc (nulls last): c (06-10) before
    // a (06-09); b (null postedAt) sorts after both.
    const seededIds = res.body.items
      .map((i: { externalId: string }) => i.externalId)
      .filter((id: string) => id.startsWith('it-ext-'));
    if (seededIds.length === 2) expect(seededIds).toEqual(['it-ext-c', 'it-ext-a']);

    // Internal bookkeeping must not leak.
    expect(res.body.items[0]).not.toHaveProperty('raw');
    expect(res.body.items[0]).not.toHaveProperty('dedupHash');
    expect(res.body.items[0]).not.toHaveProperty('sourceQuery');
  });

  it('filters by free text over title/company', async () => {
    const res = await getRequest()
      .get('/api/v1/jobs/external?q=beta')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { externalId: string }) => i.externalId)).toEqual(['it-ext-b']);
  });

  it('filters by isRemote=true', async () => {
    const res = await getRequest()
      .get('/api/v1/jobs/external?isRemote=true&q=qa')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.every((i: { isRemote: boolean }) => i.isRemote)).toBe(true);
    expect(res.body.items.some((i: { externalId: string }) => i.externalId === 'it-ext-b')).toBe(
      true,
    );
  });

  it('filters by employmentType', async () => {
    const res = await getRequest()
      .get('/api/v1/jobs/external?employmentType=INTERNSHIP')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(
      res.body.items.every((i: { employmentType: string }) => i.employmentType === 'INTERNSHIP'),
    ).toBe(true);
  });

  it('rejects an invalid employmentType with 400', async () => {
    const res = await getRequest()
      .get('/api/v1/jobs/external?employmentType=NOT_A_TYPE')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
