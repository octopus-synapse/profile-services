import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { AutomationItemNotOwnedException } from '../../../domain/exceptions/automation.exceptions';
import { InMemoryApplyModeRepository } from '../../../testing';
import { RejectCuratedItemUseCase } from './reject-curated-item.use-case';

function setupRepo() {
  const repo = new InMemoryApplyModeRepository();
  repo.addBatch({ id: 'batch-1', userId: 'user-1' });
  repo.addItem({ id: 'item-1', batchId: 'batch-1', jobId: 'job-1' });
  return repo;
}

describe('RejectCuratedItemUseCase', () => {
  it('throws when the item does not exist', async () => {
    const repo = new InMemoryApplyModeRepository();
    await expect(
      new RejectCuratedItemUseCase(repo, stubLogger).execute('user-1', 'missing'),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws when the item is owned by another user', async () => {
    const repo = setupRepo();
    await expect(
      new RejectCuratedItemUseCase(repo, stubLogger).execute('user-2', 'item-1'),
    ).rejects.toBeInstanceOf(AutomationItemNotOwnedException);
  });

  it('marks the item REJECTED with a decidedAt timestamp', async () => {
    const repo = setupRepo();
    await new RejectCuratedItemUseCase(repo, stubLogger).execute('user-1', 'item-1');
    const item = repo.items.find((i) => i.id === 'item-1');
    expect(item?.status).toBe('REJECTED');
    expect(item?.decidedAt).toBeInstanceOf(Date);
  });
});
