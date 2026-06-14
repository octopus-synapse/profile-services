import { describe, expect, it } from 'bun:test';
import {
  buildExternalJobPosting,
  InMemoryExternalJobListingsRepository,
  InMemorySavedExternalJobsRepository,
} from '../../../testing';
import { ListSavedExternalJobsUseCase } from './list-saved-external-jobs.use-case';

async function setup() {
  const listings = new InMemoryExternalJobListingsRepository();
  const fetchedAt = new Date('2026-06-10T09:00:00.000Z');
  for (const [externalId, title] of [
    ['ext-a', 'Dev Backend'],
    ['ext-b', 'QA Pleno'],
    ['ext-c', 'Estágio Mobile'],
  ] as const) {
    await listings.upsertByExternalId(
      buildExternalJobPosting({ externalId, title }),
      `${title.toLowerCase()}|acme`,
      'desenvolvedor',
      fetchedAt,
    );
  }
  const saved = new InMemorySavedExternalJobsRepository();
  return { listings, saved, useCase: new ListSavedExternalJobsUseCase(saved) };
}

describe('ListSavedExternalJobsUseCase', () => {
  it('lists only the caller rows, newest saved first', async () => {
    const { listings, saved, useCase } = await setup();
    await saved.createFromListing('user-1', listings.rows[0]);
    await saved.createFromListing('user-1', listings.rows[1]);
    await saved.createFromListing('user-2', listings.rows[2]);

    const result = await useCase.execute('user-1');

    expect(result.total).toBe(2);
    expect(result.items.map((i) => i.externalId)).toEqual(['ext-b', 'ext-a']);
  });

  it('paginates with the canonical envelope', async () => {
    const { listings, saved, useCase } = await setup();
    for (const row of listings.rows) await saved.createFromListing('user-1', row);

    const result = await useCase.execute('user-1', 1, 2);

    expect(result.total).toBe(3);
    expect(result.items.length).toBe(2);
    expect(result.hasNext).toBe(true);
  });

  it('returns an empty envelope for a user with no saves', async () => {
    const { useCase } = await setup();

    const result = await useCase.execute('user-9');

    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});
