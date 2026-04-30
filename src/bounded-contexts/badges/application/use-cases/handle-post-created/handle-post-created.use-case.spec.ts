import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryBadgesRepository } from '../../../testing';
import { HandlePostCreatedUseCase } from './handle-post-created.use-case';

describe('HandlePostCreatedUseCase', () => {
  it('awards FIRST_BUILD when the post type is BUILD', async () => {
    const repo = new InMemoryBadgesRepository();
    await new HandlePostCreatedUseCase(repo, stubLogger).execute('u-1', 'BUILD');
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]?.kind).toBe('FIRST_BUILD');
  });

  it('does nothing for non-BUILD post types', async () => {
    const repo = new InMemoryBadgesRepository();
    await new HandlePostCreatedUseCase(repo, stubLogger).execute('u-1', 'TEXT');
    expect(repo.rows).toHaveLength(0);
  });
});
