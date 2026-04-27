import { describe, expect, it } from 'bun:test';
import { InMemoryApplyModeRepository } from '../../../testing';
import { GetCurrentBatchUseCase } from './get-current-batch.use-case';

describe('GetCurrentBatchUseCase', () => {
  it('returns null when the user has no batch', async () => {
    const repo = new InMemoryApplyModeRepository();
    const result = await new GetCurrentBatchUseCase(repo).execute('user-1');
    expect(result).toBeNull();
  });

  it('projects the current batch into the API view with ISO dates', async () => {
    const repo = new InMemoryApplyModeRepository();
    const weekOf = new Date('2026-01-05T00:00:00.000Z');
    repo.addBatch({ id: 'batch-1', userId: 'user-1', weekOf, status: 'SENT' });
    repo.addItem({ id: 'item-1', batchId: 'batch-1', jobId: 'job-1', matchScore: 90 });
    repo.addItem({ id: 'item-2', batchId: 'batch-1', jobId: 'job-2', matchScore: 70 });

    const result = await new GetCurrentBatchUseCase(repo).execute('user-1');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('batch-1');
    expect(result?.weekOf).toBe(weekOf.toISOString());
    expect(result?.sentAt).toBeNull();
    expect(result?.status).toBe('SENT');
    expect(result?.items).toHaveLength(2);
    // Adapter returns items in match-score-desc order.
    expect(result?.items[0]?.id).toBe('item-1');
    expect(result?.items[0]?.matchScore).toBe(90);
  });
});
