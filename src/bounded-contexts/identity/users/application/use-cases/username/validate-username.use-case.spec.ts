import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { UsernameRepositoryPort } from '../../ports/username.port';
import { ValidateUsernameUseCase } from './validate-username.use-case';

describe('ValidateUsernameUseCase', () => {
  let useCase: ValidateUsernameUseCase;
  let repository: UsernameRepositoryPort;

  beforeEach(() => {
    repository = {
      findUserById: mock(async () => null),
      updateUsername: mock(async () => ({ username: '' })),
      findLastUsernameUpdateByUserId: mock(async () => null),
      isUsernameTaken: mock(async () => false),
    } as UsernameRepositoryPort;

    useCase = new ValidateUsernameUseCase(repository);
  });

  it('returns valid for a correct username that is available', async () => {
    const result = await useCase.execute('validuser');

    expect(result.valid).toBe(true);
    expect(result.available).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.username).toBe('validuser');
  });

  it('returns UPPERCASE error for uppercase characters', async () => {
    const result = await useCase.execute('ValidUser');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'UPPERCASE',
      message: 'Username must contain only lowercase letters',
    });
  });

  it('returns TOO_SHORT error for username under 3 characters', async () => {
    const result = await useCase.execute('ab');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'TOO_SHORT',
      message: 'Username must be at least 3 characters',
    });
  });

  it('returns TOO_LONG error for username over 30 characters', async () => {
    const result = await useCase.execute('a'.repeat(31));

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'TOO_LONG',
      message: 'Username cannot exceed 30 characters',
    });
  });

  it('returns INVALID_FORMAT error for special characters', async () => {
    const result = await useCase.execute('user@name');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'INVALID_FORMAT',
      message: 'Username can only contain lowercase letters, numbers, and underscores',
    });
  });

  it('returns INVALID_START error when username starts with a number', async () => {
    const result = await useCase.execute('1username');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'INVALID_START',
      message: 'Username must start with a letter',
    });
  });

  it('returns INVALID_END error when username ends with underscore', async () => {
    const result = await useCase.execute('username_');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'INVALID_END',
      message: 'Username must end with a letter or number',
    });
  });

  it('returns CONSECUTIVE_UNDERSCORES error for double underscores', async () => {
    const result = await useCase.execute('user__name');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'CONSECUTIVE_UNDERSCORES',
      message: 'Username cannot contain consecutive underscores',
    });
  });

  it('returns RESERVED error for reserved usernames', async () => {
    const result = await useCase.execute('admin');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'RESERVED',
      message: 'This username is reserved',
    });
  });

  it('returns ALREADY_TAKEN error when username is taken', async () => {
    repository.isUsernameTaken = mock(async () => true);

    const result = await useCase.execute('takenuser');

    expect(result.valid).toBe(false);
    expect(result.available).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'ALREADY_TAKEN',
      message: 'This username is already taken',
    });
  });

  it('does not check availability when format is invalid', async () => {
    const result = await useCase.execute('ab');

    expect(result.available).toBeUndefined();
    expect(repository.isUsernameTaken).not.toHaveBeenCalled();
  });

  it('passes userId to repository when checking availability', async () => {
    await useCase.execute('validuser', 'user-1');

    expect(repository.isUsernameTaken).toHaveBeenCalledWith('validuser', 'user-1');
  });

  it('normalizes username to lowercase', async () => {
    const result = await useCase.execute('  TestUser  ');

    expect(result.username).toBe('testuser');
  });

  it('allows underscores in valid positions', async () => {
    const result = await useCase.execute('user_name1');

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
