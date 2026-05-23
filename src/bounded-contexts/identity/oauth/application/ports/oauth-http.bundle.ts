/**
 * OAuth HTTP bundle — aggregates the use-cases, config and the
 * framework-free `OAuthPort` (`FetchOAuthAdapter`) the route handlers
 * need. Per #231 F5.H, Passport strategies were dropped in favour of
 * `OAuthPort.buildAuthorizeUrl`/`exchangeCode`; the bundle is plain DI.
 *
 * V2 D41 adds `redirectUriAllowlist`: the parsed CSV from env
 * `OAUTH_REDIRECT_URI_ALLOWLIST` so handlers can validate a
 * client-supplied `redirect_uri` before redirecting tokens to a
 * deep-link / native callback. Empty allowlist = dynamic redirect
 * disabled, falls back to the legacy `UI_BASE_URL` redirect.
 */

import type { OAuthPort } from '@/shared-kernel/auth/oauth.port';
import type { ConfigPort } from '@/shared-kernel/config';
import type { CheckOAuthProviderAvailabilityUseCase } from '../use-cases/check-oauth-provider-availability/check-oauth-provider-availability.use-case';
import type { UpsertUserFromOAuthProfileUseCase } from '../use-cases/upsert-user-from-oauth-profile/upsert-user-from-oauth-profile.use-case';

export abstract class OAuthHttpBundle {
  abstract readonly upsert: UpsertUserFromOAuthProfileUseCase;
  abstract readonly availability: CheckOAuthProviderAvailabilityUseCase;
  abstract readonly config: ConfigPort;
  /** #231 F5.H: OAuth port (FetchOAuthAdapter) replacing Passport strategies. */
  abstract readonly oauth: OAuthPort;
  /** V2 D41: Parsed `OAUTH_REDIRECT_URI_ALLOWLIST` env (CSV of wildcard patterns). */
  abstract readonly redirectUriAllowlist: readonly string[];
}
