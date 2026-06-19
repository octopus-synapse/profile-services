import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  buildExternalJobPosting,
  InMemoryExternalJobListingsRepository,
  InMemorySavedExternalJobsRepository,
} from '../../../testing';
import { MarkExternalJobAppliedUseCase } from './mark-external-job-applied.use-case';

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
  return { useCase: new MarkExternalJobAppliedUseCase(saved), saved, row };
}

describe('MarkExternalJobAppliedUseCase', () => {
  it('records a "yes" answer and stamps appliedAt', async () => {
    const { useCase, saved, row } = await setupWithSavedRow('user-1');

    const result = await useCase.execute(row.id, 'user-1', true);

    expect(result.hasApplied).toBe(true);
    expect(result.appliedAt).not.toBeNull();
    expect(saved.rows[0].hasApplied).toBe(true);
  });

  it('records a "no" answer and clears appliedAt', async () => {
    const { useCase, saved, row } = await setupWithSavedRow('user-1');
    await useCase.execute(row.id, 'user-1', true);

    const result = await useCase.execute(row.id, 'user-1', false);

    expect(result.hasApplied).toBe(false);
    expect(result.appliedAt).toBeNull();
    expect(saved.rows[0].appliedAt).toBeNull();
  });

  it('reports another user’s row as not found (no existence leak)', async () => {
    const { useCase, row } = await setupWithSavedRow('user-1');

    expect(useCase.execute(row.id, 'user-2', true)).rejects.toThrow(EntityNotFoundException);
  });

  it('reports an unknown id as not found', async () => {
    const { useCase } = await setupWithSavedRow('user-1');

    expect(useCase.execute('saved-unknown', 'user-1', true)).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
