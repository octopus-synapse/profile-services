import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import {
  UsernameCooldownActiveException,
  UsernameMustBeLowercaseException,
  UsernameReservedException,
  UsernameTakenException,
} from '../../../domain/exceptions/users.exceptions';
import { InMemoryUsernameRepository } from '../../../testing/in-memory-username.repository';
import { UpdateUsernameUseCase } from './update-username.use-case';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('UpdateUsernameUseCase', () => {
  let repository: InMemoryUsernameRepository;
  let useCase: UpdateUsernameUseCase;

  beforeEach(() => {
    repository = new InMemoryUsernameRepository();
    repository.seedUser({ id: 'user-1', username: 'olduser' });
    useCase = new UpdateUsernameUseCase(repository);
  });

  it('persists the new username and returns the updated domain entity', async () => {
    const result = await useCase.execute('user-1', 'newuser');

    expect(result).toEqual({ username: 'newuser' });
    expect(repository.usernames.has('newuser')).toBe(true);
    expect(repository.usernames.has('olduser')).toBe(false);
  });

  it('returns the current username (no-op) when the new value is unchanged', async () => {
    const before = repository.usernames;

    const result = await useCase.execute('user-1', 'olduser');

    expect(result).toEqual({ username: 'olduser' });
    expect(repository.usernames).toEqual(before);
  });

  it('throws EntityNotFoundException when the user does not exist', async () => {
    await expect(useCase.execute('non-existent', 'newuser')).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('throws UsernameMustBeLowercaseException when any character is uppercase', async () => {
    await expect(useCase.execute('user-1', 'NewUser')).rejects.toThrow(
      UsernameMustBeLowercaseException,
    );
  });

  it('throws UsernameReservedException for protected names', async () => {
    await expect(useCase.execute('user-1', 'admin')).rejects.toThrow(UsernameReservedException);
  });

  it('throws UsernameCooldownActiveException when the user updated their name within the last 30 days', async () => {
    repository.seedUser({
      id: 'user-1',
      username: 'olduser',
      lastUsernameUpdate: new Date(),
    });

    await expect(useCase.execute('user-1', 'newuser')).rejects.toThrow(
      UsernameCooldownActiveException,
    );
  });

  it('allows the update once the cooldown has elapsed', async () => {
    repository.seedUser({
      id: 'user-1',
      username: 'olduser',
      lastUsernameUpdate: new Date(Date.now() - 31 * DAY_MS),
    });

    const result = await useCase.execute('user-1', 'newuser');

    expect(result.username).toBe('newuser');
  });

  it('throws UsernameTakenException when another user owns the requested name', async () => {
    repository.seedUser({ id: 'someone-else', username: 'takenuser' });

    await expect(useCase.execute('user-1', 'takenuser')).rejects.toThrow(UsernameTakenException);
  });
});
