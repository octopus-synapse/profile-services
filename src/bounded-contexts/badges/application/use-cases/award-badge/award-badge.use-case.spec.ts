import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryBadgesRepository } from '../../../testing';
import { AwardBadgeUseCase } from './award-badge.use-case';

describe('AwardBadgeUseCase', () => {
  it('awards on the first call', async () => {
    const repo = new InMemoryBadgesRepository();
    const result = await new AwardBadgeUseCase(repo, stubLogger).execute('u-1', 'FIRST_BUILD');
    expect(result).toEqual({ awarded: true });
  });

  it('is idempotent on the second call', async () => {
    const repo = new InMemoryBadgesRepository();
    const useCase = new AwardBadgeUseCase(repo, stubLogger);
    await useCase.execute('u-1', 'FIRST_BUILD');
    const second = await useCase.execute('u-1', 'FIRST_BUILD');
    expect(second).toEqual({ awarded: false });
  });
});
