/**
 * Outbound port for "is this OAuth provider configured?" The
 * controller hits the `/available/:provider` endpoint and the
 * callback handler asks before letting passport hand off — both
 * go through this single check.
 */

import type { OAuthProvider } from '../entities/oauth-profile';

export abstract class OAuthProviderConfigPort {
  abstract hasProvider(provider: OAuthProvider): boolean;
}
