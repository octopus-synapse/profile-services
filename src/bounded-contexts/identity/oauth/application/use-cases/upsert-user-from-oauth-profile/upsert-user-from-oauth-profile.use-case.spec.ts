import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { OAuthProfile } from '../../../domain/entities/oauth-profile';
import { InMemoryOAuthAccountsRepository } from '../../../testing';
import { UpsertUserFromOAuthProfileUseCase } from './upsert-user-from-oauth-profile.use-case';

const profile: OAuthProfile = {
  provider: 'github',
  providerAccountId: 'gh-42',
  email: 'me@x.com',
  displayName: 'Me',
  photoURL: null,
  accessToken: 'fresh-token',
  refreshToken: null,
  raw: {},
};

describe('UpsertUserFromOAuthProfileUseCase', () => {
  let repo: InMemoryOAuthAccountsRepository;
  let useCase: UpsertUserFromOAuthProfileUseCase;

  beforeEach(() => {
    repo = new InMemoryOAuthAccountsRepository();
    useCase = new UpsertUserFromOAuthProfileUseCase(repo, stubLogger);
  });

  it('refreshes tokens when (provider, providerAccountId) already exists', async () => {
    const user = repo.seedUser({ email: 'me@x.com' });
    repo.seedAccount({
      userId: user.id,
      provider: 'github',
      providerAccountId: 'gh-42',
      accessToken: 'old-token',
      refreshToken: null,
    });

    const result = await useCase.execute(profile);

    expect(result).toEqual({ userId: user.id, created: false });
    expect(repo.accounts[0]?.accessToken).toBe('fresh-token');
  });

  it('attaches a new account row when an email-matching user exists', async () => {
    const user = repo.seedUser({ email: 'me@x.com' });

    const result = await useCase.execute(profile);

    expect(result).toEqual({ userId: user.id, created: false });
    expect(repo.accounts).toHaveLength(1);
  });

  it('creates a new user when neither account nor email matches', async () => {
    const result = await useCase.execute(profile);

    expect(result.created).toBe(true);
    expect(repo.users.size).toBe(1);
    expect(repo.accounts).toHaveLength(1);
  });

  it('skips the email branch when the profile has no email', async () => {
    const result = await useCase.execute({ ...profile, email: null });
    expect(result.created).toBe(true);
  });
});
