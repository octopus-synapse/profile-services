import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { AutomationItemNotOwnedException } from '../../../domain/exceptions/automation.exceptions';
import { InMemoryApplyModeRepository } from '../../../testing';
import { ApproveCuratedItemUseCase } from './approve-curated-item.use-case';

function setupRepo() {
  const repo = new InMemoryApplyModeRepository();
  repo.addBatch({ id: 'batch-1', userId: 'user-1' });
  repo.addItem({ id: 'item-1', batchId: 'batch-1', jobId: 'job-1' });
  return repo;
}

describe('ApproveCuratedItemUseCase', () => {
  it('throws when the item does not exist', async () => {
    const repo = new InMemoryApplyModeRepository();
    const uc = new ApproveCuratedItemUseCase(repo, stubLogger);
    await expect(uc.execute('user-1', 'missing')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws when the item is owned by another user', async () => {
    const repo = setupRepo();
    const uc = new ApproveCuratedItemUseCase(repo, stubLogger);
    await expect(uc.execute('user-2', 'item-1')).rejects.toBeInstanceOf(
      AutomationItemNotOwnedException,
    );
  });

  it('creates a new JobApplication on first approve', async () => {
    const repo = setupRepo();
    repo.setUserDefaults('user-1', { primaryResumeId: 'r-1', defaultCover: 'cover' });

    const result = await new ApproveCuratedItemUseCase(repo, stubLogger).execute(
      'user-1',
      'item-1',
    );

    expect(result.alreadyApplied).toBe(false);
    expect(result.applicationId).toBeDefined();
    expect(repo.applications).toHaveLength(1);
    expect(repo.applications[0]?.resumeId).toBe('r-1');
    expect(repo.applications[0]?.coverLetter).toBe('cover');
    const item = repo.items.find((i) => i.id === 'item-1');
    expect(item?.status).toBe('APPROVED');
    expect(item?.applicationId).toBe(result.applicationId);
  });

  it('is idempotent — reuses existing application on a second approve', async () => {
    const repo = setupRepo();
    const uc = new ApproveCuratedItemUseCase(repo, stubLogger);

    const first = await uc.execute('user-1', 'item-1');
    const second = await uc.execute('user-1', 'item-1');

    expect(second.applicationId).toBe(first.applicationId);
    expect(second.alreadyApplied).toBe(true);
    expect(repo.applications).toHaveLength(1);
  });
});
