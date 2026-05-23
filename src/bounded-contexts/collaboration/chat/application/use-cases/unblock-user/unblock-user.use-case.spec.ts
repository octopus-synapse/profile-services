import { beforeEach, describe, expect, it } from 'bun:test';
import { BlockNotFoundException } from '@/bounded-contexts/collaboration/domain/exceptions/collaboration.exceptions';
import { InMemoryBlockedUserRepository } from '../../../testing/in-memory/in-memory-blocked-user.repository';
import { UnblockUserUseCase } from './unblock-user.use-case';

describe('UnblockUserUseCase', () => {
  let repo: InMemoryBlockedUserRepository;
  let useCase: UnblockUserUseCase;

  beforeEach(() => {
    repo = new InMemoryBlockedUserRepository();
    useCase = new UnblockUserUseCase(repo);
  });

  it('unblocks a previously blocked user', async () => {
    repo.seedBlock({ blockerId: 'blocker-1', blockedId: 'blocked-1' });
    await useCase.execute('blocker-1', 'blocked-1');
    expect(await repo.isBlocked('blocker-1', 'blocked-1')).toBe(false);
  });

  it('throws BlockNotFoundException when the relationship does not exist', async () => {
    await expect(useCase.execute('blocker-1', 'never-blocked')).rejects.toThrow(
      BlockNotFoundException,
    );
  });
});
