import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { InMemoryUserManagementRepository } from '../../../../shared-kernel/testing';
import { UpdateUserUseCase } from './update-user.use-case';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let repository: InMemoryUserManagementRepository;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    repository.seedUser({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      hasCompletedOnboarding: true,
    });
    useCase = new UpdateUserUseCase(repository);
  });

  it('updates user and returns domain entity (not envelope)', async () => {
    const result = await useCase.execute('user-1', {
      name: 'Updated User',
      email: 'updated@example.com',
    });

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('updated@example.com');
    expect(result.name).toBe('Updated User');

    const persistedUser = repository.getUser('user-1');
    expect(persistedUser?.email).toBe('updated@example.com');
    expect(persistedUser?.name).toBe('Updated User');

    // CRITICAL: No envelope fields
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('message');
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    await expect(useCase.execute('non-existent', { name: 'Test' })).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
