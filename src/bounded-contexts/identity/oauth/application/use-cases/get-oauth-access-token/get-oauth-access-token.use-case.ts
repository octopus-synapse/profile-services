/**
 * Returns the stored access token for a (userId, provider). Used by
 * the import BC to fetch the user's GitHub data without re-running
 * the OAuth flow. Returns null if the user never connected the
 * provider.
 */

import type { OAuthProvider } from '../../../domain/entities/oauth-profile';
import { OAuthAccountsRepositoryPort } from '../../../domain/ports/oauth-accounts.repository.port';

export class GetOAuthAccessTokenUseCase {
  constructor(private readonly accounts: OAuthAccountsRepositoryPort) {}

  execute(userId: string, provider: OAuthProvider): Promise<string | null> {
    return this.accounts.findAccessToken(userId, provider);
  }
}
