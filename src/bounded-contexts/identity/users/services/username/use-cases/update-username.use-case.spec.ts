import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions';
import type { UsernameRepositoryPort } from '../ports/username.port';
import { UpdateUsernameUseCase } from './update-username.use-case';

describe('UpdateUsernameUseCase', () => {
  let useCase: UpdateUsernameUseCase;
  let repository: UsernameRepositoryPort;

  beforeEach(() => {
    repository = {
      findUserById: mock(async () => ({ id: 'user-1', username: 'olduser' })),
      updateUsername: mock(async () => ({ username: 'newuser' })),
      findLastUsernameUpdateByUserId: mock(async () => null),
      isUsernameTaken: mock(async () => false),
    } as UsernameRepositoryPort;

    useCase = new UpdateUsernameUseCase(repository);
  });

  it('updates username and returns domain entity (not envelope)', async () => {
    const result = await useCase.execute('user-1', 'newuser');

    expect(repository.findUserById).toHaveBeenCalledWith('user-1');
    expect(repository.updateUsername).toHaveBeenCalledWith('user-1', 'newuser');

    // CRITICAL: Returns domain entity, not envelope
    expect(result).toEqual({ username: 'newuser' });
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('message');
  });

  it('returns current username when unchanged', async () => {
    const result = await useCase.execute('user-1', 'olduser');

    expect(result).toEqual({ username: 'olduser' });
    expect(repository.updateUsername).not.toHaveBeenCalled();
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    repository.findUserById = mock(async () => null);

    await expect(useCase.execute('non-existent', 'newuser')).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('throws ValidationException for uppercase username', async () => {
    await expect(useCase.execute('user-1', 'NewUser')).rejects.toThrow(ValidationException);
  });

  it('throws ValidationException for reserved username', async () => {
    await expect(useCase.execute('user-1', 'admin')).rejects.toThrow(ValidationException);
  });

  it('throws ValidationException during cooldown period', async () => {
    repository.findLastUsernameUpdateByUserId = mock(async () => new Date());

    await expect(useCase.execute('user-1', 'newuser')).rejects.toThrow(ValidationException);
  });

  it('throws ConflictException when username is taken', async () => {
    repository.isUsernameTaken = mock(async () => true);

    await expect(useCase.execute('user-1', 'takenuser')).rejects.toThrow(ConflictException);
  });
});
