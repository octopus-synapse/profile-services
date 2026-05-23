/**
 * Outbound port for OAuth account/user persistence. The use case
 * decides the matching order (account → email → create); the
 * adapter only knows how to read/write the rows.
 */

import type { OAuthProfile, OAuthProvider } from '../entities/oauth-profile';

/**
 * Result shape for `findUserByEmail`. Carries `emailVerified` so the use case
 * can refuse to link a new OAuth account to a User whose email was never
 * verified — preventing account takeover via squatted unverified emails.
 */
export interface OAuthUserByEmailResult {
  readonly userId: string;
  readonly emailVerified: boolean;
}

export abstract class OAuthAccountsRepositoryPort {
  abstract findUserIdByProviderAccount(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<string | null>;

  abstract findUserByEmail(email: string): Promise<OAuthUserByEmailResult | null>;

  abstract createUserFromProfile(profile: OAuthProfile): Promise<string>;

  abstract createAccountForUser(userId: string, profile: OAuthProfile): Promise<void>;

  abstract refreshAccountTokens(userId: string, profile: OAuthProfile): Promise<void>;

  abstract findAccessToken(userId: string, provider: OAuthProvider): Promise<string | null>;
}
