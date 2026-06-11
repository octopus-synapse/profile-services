import { describe, expect, it } from 'bun:test';
import { buildExternalJobPosting, InMemoryExternalJobListingsRepository } from '../../../testing';
import { ListExternalJobsUseCase } from './list-external-jobs.use-case';

async function seededRepo() {
  const repo = new InMemoryExternalJobListingsRepository();
  const fetchedAt = new Date('2026-06-10T09:00:00.000Z');
  await repo.upsertByExternalId(
    buildExternalJobPosting({ externalId: 'a', title: 'Dev Backend', isRemote: true }),
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
    }),
    'estagio mobile|gamma',
    'desenvolvedor mobile',
    fetchedAt,
  );
  return repo;
}

describe('ListExternalJobsUseCase', () => {
  it('returns the canonical paginated envelope', async () => {
    const useCase = new ListExternalJobsUseCase(await seededRepo());

    const result = await useCase.execute({}, 1, 2);

    expect(result.total).toBe(3);
    expect(result.items.length).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it('filters by free text over title/company', async () => {
    const useCase = new ListExternalJobsUseCase(await seededRepo());

    const byTitle = await useCase.execute({ q: 'backend' });
    expect(byTitle.items.map((i) => i.externalId)).toEqual(['a']);

    const byCompany = await useCase.execute({ q: 'beta' });
    expect(byCompany.items.map((i) => i.externalId)).toEqual(['b']);
  });

  it('filters by isRemote and employmentType', async () => {
    const useCase = new ListExternalJobsUseCase(await seededRepo());

    const remote = await useCase.execute({ isRemote: true });
    expect(remote.items.map((i) => i.externalId)).toEqual(['a']);

    const interns = await useCase.execute({ employmentType: 'INTERNSHIP' });
    expect(interns.items.map((i) => i.externalId)).toEqual(['c']);
  });

  it('clamps limit to 100 and page to >= 1', async () => {
    const useCase = new ListExternalJobsUseCase(await seededRepo());

    const result = await useCase.execute({}, -5, 500);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });
});
