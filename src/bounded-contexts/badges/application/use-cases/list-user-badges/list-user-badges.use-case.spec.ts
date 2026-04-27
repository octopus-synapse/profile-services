import { describe, expect, it } from 'bun:test';
import { InMemoryBadgesRepository } from '../../../testing';
import { ListUserBadgesUseCase } from './list-user-badges.use-case';

describe('ListUserBadgesUseCase', () => {
  it('projects badges into the {kind, awardedAt: ISO} view', async () => {
    const repo = new InMemoryBadgesRepository();
    await repo.award('u-1', 'FIRST_BUILD');

    const result = await new ListUserBadgesUseCase(repo).execute('u-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe('FIRST_BUILD');
    expect(typeof result[0]?.awardedAt).toBe('string');
  });

  it('returns empty for users with no badges', async () => {
    const repo = new InMemoryBadgesRepository();
    expect(await new ListUserBadgesUseCase(repo).execute('nope')).toEqual([]);
  });
});
