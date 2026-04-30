/**
 * Normalized profile each strategy hands back after a successful
 * OAuth round-trip. Provider-specific fields (company, bio, …) live
 * on `raw` so import use-cases can reach for them without us inventing
 * a tagged union per provider.
 */

export type OAuthProvider = 'github' | 'linkedin';

export interface OAuthProfile {
  readonly provider: OAuthProvider;
  readonly providerAccountId: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly raw: Record<string, unknown>;
}

export interface OAuthUpsertResult {
  readonly userId: string;
  readonly created: boolean;
}
