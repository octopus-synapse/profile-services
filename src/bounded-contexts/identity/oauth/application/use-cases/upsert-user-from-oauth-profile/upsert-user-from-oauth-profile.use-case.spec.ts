import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { OAuthProfile } from '../../../domain/entities/oauth-profile';
import { OAuthEmailMismatchException } from '../../../domain/exceptions/oauth.exceptions';
import { InMemoryOAuthAccountsRepository } from '../../../testing';
import { UpsertUserFromOAuthProfileUseCase } from './upsert-user-from-oauth-profile.use-case';

const verifiedProfile: OAuthProfile = {
  provider: 'github',
  providerAccountId: 'gh-42',
  email: 'me@x.com',
  emailVerified: true,
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
    const user = repo.seedUser({ email: 'me@x.com', emailVerified: true });
    repo.seedAccount({
      userId: user.id,
      provider: 'github',
      providerAccountId: 'gh-42',
      accessToken: 'old-token',
      refreshToken: null,
    });

    const result = await useCase.execute(verifiedProfile);

    expect(result).toEqual({ userId: user.id, created: false });
    expect(repo.accounts[0]?.accessToken).toBe('fresh-token');
  });

  it('attaches a new account row when an email-matching user exists AND both sides are verified', async () => {
    const user = repo.seedUser({ email: 'me@x.com', emailVerified: true });

    const result = await useCase.execute(verifiedProfile);

    expect(result).toEqual({ userId: user.id, created: false });
    expect(repo.accounts).toHaveLength(1);
  });

  it('creates a new user when neither account nor email matches', async () => {
    const result = await useCase.execute(verifiedProfile);

    expect(result.created).toBe(true);
    expect(repo.users.size).toBe(1);
    expect(repo.accounts).toHaveLength(1);
  });

  it('skips the email branch when the profile has no email', async () => {
    const result = await useCase.execute({ ...verifiedProfile, email: null });
    expect(result.created).toBe(true);
  });

  // P0-#3 regression: account-takeover protection.
  it('refuses to link by email when the OAuth profile email is NOT verified', async () => {
    repo.seedUser({ email: 'victim@x.com', emailVerified: true });
    await expect(
      useCase.execute({ ...verifiedProfile, email: 'victim@x.com', emailVerified: false }),
    ).rejects.toBeInstanceOf(OAuthEmailMismatchException);
  });

  it('refuses to link by email when the existing User has NO verified email', async () => {
    repo.seedUser({ email: 'me@x.com', emailVerified: false });
    await expect(useCase.execute(verifiedProfile)).rejects.toBeInstanceOf(
      OAuthEmailMismatchException,
    );
  });

  it('creates a new user with emailVerified=false when profile email is unverified and no existing user', async () => {
    const result = await useCase.execute({ ...verifiedProfile, emailVerified: false });
    expect(result.created).toBe(true);
    const created = Array.from(repo.users.values())[0];
    expect(created?.emailVerified).toBe(false);
  });
});
