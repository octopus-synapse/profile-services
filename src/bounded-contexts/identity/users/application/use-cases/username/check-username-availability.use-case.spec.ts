import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryUsernameRepository } from '../../../testing/in-memory-username.repository';
import { CheckUsernameAvailabilityUseCase } from './check-username-availability.use-case';

describe('CheckUsernameAvailabilityUseCase', () => {
  let repository: InMemoryUsernameRepository;
  let useCase: CheckUsernameAvailabilityUseCase;

  beforeEach(() => {
    repository = new InMemoryUsernameRepository();
    useCase = new CheckUsernameAvailabilityUseCase(repository);
  });

  it('returns available=true when format is valid + name is free', async () => {
    const result = await useCase.execute('johndoe');

    expect(result).toEqual({ username: 'johndoe', available: true });
  });

  it('returns reason=invalid_format and short-circuits the DB lookup for malformed names', async () => {
    repository.seedUser({ id: 'someone', username: 'taken_user' });

    const result = await useCase.execute('John@Doe');

    expect(result).toEqual({
      username: 'john@doe',
      available: false,
      reason: 'invalid_format',
    });
  });

  it('returns reason=reserved for protected names without hitting the repository', async () => {
    const result = await useCase.execute('admin');

    expect(result).toEqual({ username: 'admin', available: false, reason: 'reserved' });
  });

  it('returns reason=taken when the format passes but the name is in use', async () => {
    repository.seedUser({ id: 'someone', username: 'johndoe' });

    const result = await useCase.execute('johndoe');

    expect(result).toEqual({ username: 'johndoe', available: false, reason: 'taken' });
  });

  it('lets the requester re-claim their own username (excludes their userId from takeness check)', async () => {
    repository.seedUser({ id: 'me', username: 'johndoe' });

    const result = await useCase.execute('johndoe', 'me');

    expect(result.available).toBe(true);
  });

  it('normalizes input (trim + lower-case) before any check', async () => {
    const result = await useCase.execute('  JohnDoe  ');

    expect(result.username).toBe('johndoe');
    expect(result.available).toBe(true);
  });
});
