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
  /**
   * `true` only when the provider asserts the email is verified on their side.
   * For GitHub this requires looking up `/user/emails` and finding the primary
   * address with `verified: true`; for Google/LinkedIn we trust `email_verified`.
   * Anything else (including merely having an email present) MUST be `false`.
   * Account linking by email requires this to be `true` on both sides.
   */
  readonly emailVerified: boolean;
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
