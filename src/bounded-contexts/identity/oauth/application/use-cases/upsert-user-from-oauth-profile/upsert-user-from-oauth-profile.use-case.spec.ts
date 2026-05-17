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

  // P0-#3 + P1 #8 regression: account-takeover protection. Either side
  // with `emailVerified: false` MUST refuse to link — without this gate
  // an attacker creates a GitHub account under the victim's email
  // (GitHub allows pre-verification sign-up via secondary email) and
  // inherits the victim's User on the OAuth callback.
  it('refuses to link by email when the OAuth profile email is NOT verified', async () => {
    repo.seedUser({ email: 'victim@x.com', emailVerified: true });
    await expect(
      useCase.execute({ ...verifiedProfile, email: 'victim@x.com', emailVerified: false }),
    ).rejects.toBeInstanceOf(OAuthEmailMismatchException);
    // No new account row should be persisted on the attacker-controlled
    // OAuth profile — the exception fires before createAccountForUser.
    expect(repo.accounts).toHaveLength(0);
  });

  it('refuses to link by email when the existing User has NO verified email', async () => {
    repo.seedUser({ email: 'me@x.com', emailVerified: false });
    await expect(useCase.execute(verifiedProfile)).rejects.toBeInstanceOf(
      OAuthEmailMismatchException,
    );
    expect(repo.accounts).toHaveLength(0);
  });

  // P1 #8 — an attacker who sweeps a victim's email across providers
  // should always hit `OAuthEmailMismatchException`, never silently
  // create a takeover account. Verify the message points at the
  // problem (no leak of which side is unverified).
  it('keeps the exception generic so it does not leak which side is unverified', async () => {
    repo.seedUser({ email: 'victim@x.com', emailVerified: true });
    try {
      await useCase.execute({
        ...verifiedProfile,
        email: 'victim@x.com',
        emailVerified: false,
      });
      throw new Error('expected OAuthEmailMismatchException');
    } catch (err) {
      expect(err).toBeInstanceOf(OAuthEmailMismatchException);
      const msg = (err as Error).message;
      // The message should not embed the victim's email — an attacker
      // who can read response bodies via a misconfigured proxy
      // shouldn't get confirmation that the email is registered.
      expect(msg.toLowerCase()).not.toContain('victim@x.com');
    }
  });

  it('creates a new user with emailVerified=false when profile email is unverified and no existing user', async () => {
    const result = await useCase.execute({ ...verifiedProfile, emailVerified: false });
    expect(result.created).toBe(true);
    const created = Array.from(repo.users.values())[0];
    expect(created?.emailVerified).toBe(false);
  });
});
