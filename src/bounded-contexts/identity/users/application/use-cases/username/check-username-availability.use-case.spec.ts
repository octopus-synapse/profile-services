import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { UsernameRepositoryPort } from '../../ports/username.port';
import { CheckUsernameAvailabilityUseCase } from './check-username-availability.use-case';

describe('CheckUsernameAvailabilityUseCase', () => {
  let useCase: CheckUsernameAvailabilityUseCase;
  let repository: UsernameRepositoryPort;

  beforeEach(() => {
    repository = {
      findUserById: mock(async () => null),
      updateUsername: mock(async () => ({ username: '' })),
      findLastUsernameUpdateByUserId: mock(async () => null),
      isUsernameTaken: mock(async () => false),
    } as UsernameRepositoryPort;

    useCase = new CheckUsernameAvailabilityUseCase(repository);
  });

  it('returns available when username is not taken', async () => {
    repository.isUsernameTaken = mock(async () => false);

    const result = await useCase.execute('johndoe');

    expect(result).toEqual({ username: 'johndoe', available: true });
    expect(repository.isUsernameTaken).toHaveBeenCalledWith('johndoe', undefined);
  });

  it('returns unavailable when username is taken', async () => {
    repository.isUsernameTaken = mock(async () => true);

    const result = await useCase.execute('takenuser');

    expect(result).toEqual({ username: 'takenuser', available: false });
  });

  it('normalizes username to lowercase before checking', async () => {
    repository.isUsernameTaken = mock(async () => false);

    const result = await useCase.execute('JohnDoe');

    expect(result.username).toBe('johndoe');
    expect(repository.isUsernameTaken).toHaveBeenCalledWith('johndoe', undefined);
  });

  it('passes userId as excludeUserId to repository', async () => {
    repository.isUsernameTaken = mock(async () => false);

    await useCase.execute('johndoe', 'user-1');

    expect(repository.isUsernameTaken).toHaveBeenCalledWith('johndoe', 'user-1');
  });

  it('returns domain entity, not envelope', async () => {
    const result = await useCase.execute('testuser');

    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('available');
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('message');
  });
});
