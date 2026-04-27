/**
 * Outbound port for OAuth account/user persistence. The use case
 * decides the matching order (account → email → create); the
 * adapter only knows how to read/write the rows.
 */

import type { OAuthProfile, OAuthProvider } from '../entities/oauth-profile';

export abstract class OAuthAccountsRepositoryPort {
  abstract findUserIdByProviderAccount(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<string | null>;

  abstract findUserIdByEmail(email: string): Promise<string | null>;

  abstract createUserFromProfile(profile: OAuthProfile): Promise<string>;

  abstract createAccountForUser(userId: string, profile: OAuthProfile): Promise<void>;

  abstract refreshAccountTokens(userId: string, profile: OAuthProfile): Promise<void>;

  abstract findAccessToken(userId: string, provider: OAuthProvider): Promise<string | null>;
}
