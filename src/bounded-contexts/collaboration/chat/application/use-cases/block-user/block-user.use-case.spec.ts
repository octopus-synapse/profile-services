import { beforeEach, describe, expect, it } from 'bun:test';
import {
  AlreadyBlockedException,
  CannotBlockSelfException,
} from '@/bounded-contexts/collaboration/domain/exceptions/collaboration.exceptions';
import { InMemoryBlockedUserRepository } from '../../../testing/in-memory/in-memory-blocked-user.repository';
import { BlockUserUseCase } from './block-user.use-case';

describe('BlockUserUseCase', () => {
  let repo: InMemoryBlockedUserRepository;
  let useCase: BlockUserUseCase;

  beforeEach(() => {
    repo = new InMemoryBlockedUserRepository();
    useCase = new BlockUserUseCase(repo);
  });

  it('blocks a user', async () => {
    const result = await useCase.execute('blocker-1', { userId: 'blocked-1' });
    expect(result.user.id).toBe('blocked-1');
  });

  it('throws CannotBlockSelfException when blocking self', async () => {
    await expect(useCase.execute('user-1', { userId: 'user-1' })).rejects.toThrow(
      CannotBlockSelfException,
    );
  });

  it('throws AlreadyBlockedException when the user is already blocked', async () => {
    repo.seedBlock({ blockerId: 'blocker-1', blockedId: 'blocked-1' });
    await expect(useCase.execute('blocker-1', { userId: 'blocked-1' })).rejects.toThrow(
      AlreadyBlockedException,
    );
  });
});
