/**
 * OAuth HTTP bundle — aggregates the use-cases and config the route
 * handlers need. Passport strategies stay framework-coupled (the Nest
 * adapter wires them into a Passport guard via the route's `guards:`
 * registry); the rest is plain DI.
 */

import type { OAuthPort } from '@/shared-kernel/auth/oauth.port';
import type { ConfigPort } from '@/shared-kernel/config';
import type { CheckOAuthProviderAvailabilityUseCase } from '../use-cases/check-oauth-provider-availability/check-oauth-provider-availability.use-case';
import type { UpsertUserFromOAuthProfileUseCase } from '../use-cases/upsert-user-from-oauth-profile/upsert-user-from-oauth-profile.use-case';

export abstract class OAuthHttpBundle {
  abstract readonly upsert: UpsertUserFromOAuthProfileUseCase;
  abstract readonly availability: CheckOAuthProviderAvailabilityUseCase;
  abstract readonly config: ConfigPort;
  abstract readonly oauth: OAuthPort;
}
