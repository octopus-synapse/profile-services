/**
 * Framework-free OAuth2 port. Replaces the per-provider Passport
 * strategies (LinkedIn, GitHub, Google) with a single contract:
 * authorize URL generation + code exchange. The Elysia adapter
 * implements it via `@elysiajs/oauth2` (or direct `fetch` calls if
 * the plugin doesn't fit a particular provider).
 *
 * The shape is intentionally minimal — adapters return a normalized
 * `OAuthProfile` and the BC's use-case decides how to upsert /
 * link the account. The token exchange + profile fetch happen
 * inside the adapter so consumers stay framework-free.
 */

export interface OAuthAuthorizeOptions {
  readonly state: string;
  readonly redirectUri: string;
  readonly scopes?: readonly string[];
}

export interface OAuthCodeExchangeInput {
  readonly code: string;
  readonly redirectUri: string;
  readonly state?: string;
}

export interface OAuthProfile {
  readonly providerId: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly raw: Record<string, unknown>;
}

export type OAuthProvider = 'google' | 'linkedin' | 'github';

export abstract class OAuthPort {
  /** Build the provider's authorize URL the user is redirected to. */
  abstract buildAuthorizeUrl(provider: OAuthProvider, options: OAuthAuthorizeOptions): string;

  /** Exchange the authorization code for a profile. Adapter handles
   *  token request + profile lookup + normalization. */
  abstract exchangeCode(
    provider: OAuthProvider,
    input: OAuthCodeExchangeInput,
  ): Promise<OAuthProfile>;
}
