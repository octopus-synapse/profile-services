import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  buildExternalJobPosting,
  InMemoryExternalJobListingsRepository,
  InMemorySavedExternalJobsRepository,
} from '../../../testing';
import { SaveExternalJobUseCase } from './save-external-job.use-case';

async function setup() {
  const listings = new InMemoryExternalJobListingsRepository();
  await listings.upsertByExternalId(
    buildExternalJobPosting({ externalId: 'ext-a', title: 'Dev Backend', workMode: 'HYBRID' }),
    'dev backend|acme ltda',
    'desenvolvedor',
    new Date('2026-06-10T09:00:00.000Z'),
  );
  const saved = new InMemorySavedExternalJobsRepository();
  const listingId = listings.rows[0].id;
  return { useCase: new SaveExternalJobUseCase(listings, saved, stubLogger), saved, listingId };
}

describe('SaveExternalJobUseCase', () => {
  it('snapshots the listing display fields into a saved row', async () => {
    const { useCase, saved, listingId } = await setup();

    const result = await useCase.execute(listingId, 'user-1');

    expect(result.alreadySaved).toBe(false);
    expect(result.externalId).toBe('ext-a');
    const row = saved.rows[0];
    expect(row.userId).toBe('user-1');
    expect(row.title).toBe('Dev Backend');
    expect(row.workMode).toBe('HYBRID');
  });

  it('is idempotent per user (re-save returns the existing row)', async () => {
    const { useCase, saved, listingId } = await setup();

    const first = await useCase.execute(listingId, 'user-1');
    const second = await useCase.execute(listingId, 'user-1');

    expect(second.alreadySaved).toBe(true);
    expect(second.savedId).toBe(first.savedId);
    expect(saved.rows.length).toBe(1);
  });

  it('keeps saves user-scoped', async () => {
    const { useCase, saved, listingId } = await setup();

    await useCase.execute(listingId, 'user-1');
    const other = await useCase.execute(listingId, 'user-2');

    expect(other.alreadySaved).toBe(false);
    expect(saved.rows.length).toBe(2);
  });

  it('throws EntityNotFoundException when the listing was already swept', async () => {
    const { useCase } = await setup();

    expect(useCase.execute('missing-id', 'user-1')).rejects.toThrow(EntityNotFoundException);
  });
});
