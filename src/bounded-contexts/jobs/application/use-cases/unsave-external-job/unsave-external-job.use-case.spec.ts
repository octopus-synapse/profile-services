import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  buildExternalJobPosting,
  InMemoryExternalJobListingsRepository,
  InMemorySavedExternalJobsRepository,
} from '../../../testing';
import { UnsaveExternalJobUseCase } from './unsave-external-job.use-case';

async function setupWithSavedRow(userId: string) {
  const listings = new InMemoryExternalJobListingsRepository();
  await listings.upsertByExternalId(
    buildExternalJobPosting({ externalId: 'ext-a' }),
    'dev backend|acme ltda',
    'desenvolvedor',
    new Date('2026-06-10T09:00:00.000Z'),
  );
  const saved = new InMemorySavedExternalJobsRepository();
  const row = await saved.createFromListing(userId, listings.rows[0]);
  return { useCase: new UnsaveExternalJobUseCase(saved), saved, row };
}

describe('UnsaveExternalJobUseCase', () => {
  it('deletes the caller-owned saved row', async () => {
    const { useCase, saved, row } = await setupWithSavedRow('user-1');

    const result = await useCase.execute(row.id, 'user-1');

    expect(result.removed).toBe(true);
    expect(saved.rows.length).toBe(0);
  });

  it('is idempotent: unknown ids report removed without raising', async () => {
    const { useCase } = await setupWithSavedRow('user-1');

    const result = await useCase.execute('saved-unknown', 'user-1');

    expect(result.removed).toBe(true);
  });

  it('reports another user’s row as not found (no existence leak)', async () => {
    const { useCase, saved, row } = await setupWithSavedRow('user-1');

    expect(useCase.execute(row.id, 'user-2')).rejects.toThrow(EntityNotFoundException);
    expect(saved.rows.length).toBe(1);
  });
});
