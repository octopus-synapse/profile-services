import { describe, expect, it } from 'bun:test';
import { InMemoryOAuthAccountsRepository } from '../../../testing';
import { GetOAuthAccessTokenUseCase } from './get-oauth-access-token.use-case';

describe('GetOAuthAccessTokenUseCase', () => {
  it('returns the stored access token for the (userId, provider)', async () => {
    const repo = new InMemoryOAuthAccountsRepository();
    repo.seedAccount({
      userId: 'u-1',
      provider: 'github',
      providerAccountId: 'gh-1',
      accessToken: 'tok',
      refreshToken: null,
    });
    expect(await new GetOAuthAccessTokenUseCase(repo).execute('u-1', 'github')).toBe('tok');
  });

  it('returns null when the user never connected the provider', async () => {
    const repo = new InMemoryOAuthAccountsRepository();
    expect(await new GetOAuthAccessTokenUseCase(repo).execute('u-1', 'github')).toBeNull();
  });
});
