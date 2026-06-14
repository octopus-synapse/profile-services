import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  buildExternalJobPosting,
  InMemoryExternalJobListingsRepository,
  InMemorySavedExternalJobsRepository,
} from '../../../testing';
import { ListExternalJobsUseCase } from './list-external-jobs.use-case';

const NOW = new Date('2026-06-12T12:00:00.000Z');

async function seededRepo() {
  const repo = new InMemoryExternalJobListingsRepository();
  const fetchedAt = new Date('2026-06-10T09:00:00.000Z');
  await repo.upsertByExternalId(
    buildExternalJobPosting({
      externalId: 'a',
      title: 'Dev Backend',
      isRemote: true,
      workMode: 'REMOTE',
      postedAt: new Date('2026-06-12T08:00:00.000Z'),
    }),
    'dev backend|acme ltda',
    'desenvolvedor',
    fetchedAt,
  );
  await repo.upsertByExternalId(
    buildExternalJobPosting({
      externalId: 'b',
      title: 'QA Pleno',
      company: 'Beta SA',
      employmentType: 'CONTRACT',
      workMode: 'HYBRID',
      postedAt: new Date('2026-06-08T08:00:00.000Z'),
    }),
    'qa pleno|beta sa',
    'qa',
    fetchedAt,
  );
  await repo.upsertByExternalId(
    buildExternalJobPosting({
      externalId: 'c',
      title: 'Estágio Mobile',
      company: 'Gamma',
      employmentType: 'INTERNSHIP',
      // postedAt stays null — recency falls back to fetchedAt (2026-06-10).
    }),
    'estagio mobile|gamma',
    'desenvolvedor mobile',
    fetchedAt,
  );
  return repo;
}

async function makeUseCase() {
  const saved = new InMemorySavedExternalJobsRepository();
  const useCase = new ListExternalJobsUseCase(await seededRepo(), saved, stubLogger, () => NOW);
  return { useCase, saved };
}

describe('ListExternalJobsUseCase', () => {
  it('returns the canonical paginated envelope', async () => {
    const { useCase } = await makeUseCase();

    const result = await useCase.execute({}, 1, 2);

    expect(result.total).toBe(3);
    expect(result.items.length).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it('filters by free text over title/company', async () => {
    const { useCase } = await makeUseCase();

    const byTitle = await useCase.execute({ q: 'backend' });
    expect(byTitle.items.map((i) => i.externalId)).toEqual(['a']);

    const byCompany = await useCase.execute({ q: 'beta' });
    expect(byCompany.items.map((i) => i.externalId)).toEqual(['b']);
  });

  it('filters by workMode and employmentType as any-of sets', async () => {
    const { useCase } = await makeUseCase();

    const remote = await useCase.execute({ workMode: ['REMOTE'] });
    expect(remote.items.map((i) => i.externalId)).toEqual(['a']);

    const remoteOrHybrid = await useCase.execute({ workMode: ['REMOTE', 'HYBRID'] });
    expect(remoteOrHybrid.items.map((i) => i.externalId)).toEqual(['a', 'b']);

    const contractOrIntern = await useCase.execute({
      employmentType: ['CONTRACT', 'INTERNSHIP'],
    });
    expect(contractOrIntern.items.map((i) => i.externalId)).toEqual(['b', 'c']);
  });

  it('filters postedWithin over postedAt with fetchedAt fallback', async () => {
    const { useCase } = await makeUseCase();

    // TODAY (24h from NOW): only 'a' (posted 06-12 08:00).
    const today = await useCase.execute({ postedWithin: 'TODAY' });
    expect(today.items.map((i) => i.externalId)).toEqual(['a']);

    // LAST_3_DAYS: 'a' plus 'c' via the fetchedAt fallback (06-10).
    const last3 = await useCase.execute({ postedWithin: 'LAST_3_DAYS' });
    expect(last3.items.map((i) => i.externalId)).toEqual(['a', 'c']);

    // LAST_WEEK: all three ('b' posted 06-08).
    const week = await useCase.execute({ postedWithin: 'LAST_WEEK' });
    expect(week.items.length).toBe(3);
  });

  it('annotates each item with the caller savedId', async () => {
    const { useCase, saved } = await makeUseCase();
    const listing = (await useCase.execute({ q: 'backend' })).items[0];
    const row = await saved.createFromListing('user-1', listing);

    const mine = await useCase.execute({}, 1, 20, 'user-1');
    const byId = new Map(mine.items.map((i) => [i.externalId, i.savedId]));
    expect(byId.get('a')).toBe(row.id);
    expect(byId.get('b')).toBeNull();

    const someoneElse = await useCase.execute({}, 1, 20, 'user-2');
    expect(someoneElse.items.every((i) => i.savedId === null)).toBe(true);
  });

  it('clamps limit to 100 and page to >= 1', async () => {
    const { useCase } = await makeUseCase();

    const result = await useCase.execute({}, -5, 500);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });
});
