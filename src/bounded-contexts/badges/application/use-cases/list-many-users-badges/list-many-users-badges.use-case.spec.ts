import { describe, expect, it } from 'bun:test';
import { InMemoryBadgesRepository } from '../../../testing';
import { ListManyUsersBadgesUseCase } from './list-many-users-badges.use-case';

describe('ListManyUsersBadgesUseCase', () => {
  it('returns an empty map when given no userIds', async () => {
    const repo = new InMemoryBadgesRepository();
    const result = await new ListManyUsersBadgesUseCase(repo).execute([]);
    expect(result.size).toBe(0);
  });

  it('groups awarded kinds by userId', async () => {
    const repo = new InMemoryBadgesRepository();
    await repo.award('u-1', 'FIRST_BUILD');
    await repo.award('u-1', 'MENTORED_10');
    await repo.award('u-2', 'FIRST_BUILD');

    const result = await new ListManyUsersBadgesUseCase(repo).execute(['u-1', 'u-2']);
    expect(result.get('u-1')).toEqual(['FIRST_BUILD', 'MENTORED_10']);
    expect(result.get('u-2')).toEqual(['FIRST_BUILD']);
  });
});
