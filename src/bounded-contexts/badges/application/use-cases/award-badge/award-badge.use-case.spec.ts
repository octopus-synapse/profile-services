import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  BadgeAlreadyAwardedException,
  BadgeCriteriaNotMetException,
} from '../../../domain/exceptions/badges.exceptions';
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

  it('throws BadgeAlreadyAwardedException in strict mode when re-awarding', async () => {
    const repo = new InMemoryBadgesRepository();
    const useCase = new AwardBadgeUseCase(repo, stubLogger);
    await useCase.execute('u-1', 'FIRST_BUILD');
    await expect(
      useCase.execute('u-1', 'FIRST_BUILD', undefined, { strict: true }),
    ).rejects.toThrow(BadgeAlreadyAwardedException);
  });

  it('throws BadgeCriteriaNotMetException in strict mode when criteria fail', async () => {
    const repo = new InMemoryBadgesRepository();
    const useCase = new AwardBadgeUseCase(repo, stubLogger);
    await expect(
      useCase.execute('u-1', 'FIRST_BUILD', undefined, { strict: true, criteriaMet: false }),
    ).rejects.toThrow(BadgeCriteriaNotMetException);
  });
});
