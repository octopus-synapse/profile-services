/**
 * Pure-TS wiring for the identity/oauth BC. Zero `@nestjs/*` imports.
 *
 * The HTTP routes consume an `OAuthHttpBundle` (upsert use-case +
 * provider availability + config). For cross-BC consumers (the
 * `import` BC) we additionally expose `getOAuthAccessToken` — the
 * token fetcher reused outside the OAuth flow itself.
 *
 * The Passport strategy classes (`GithubOAuthStrategy`,
 * `LinkedinOAuthStrategy`, …) and their guards stay framework-coupled
 * and live in the Nest module shell — they're not part of the
 * framework-free composition. The Elysia path eventually consumes
 * `OAuthPort` (`FetchOAuthAdapter`) instead.
 */
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import { OAuthHttpBundle } from './application/ports/oauth-http.bundle';
import { CheckOAuthProviderAvailabilityUseCase } from './application/use-cases/check-oauth-provider-availability/check-oauth-provider-availability.use-case';
import { GetOAuthAccessTokenUseCase } from './application/use-cases/get-oauth-access-token/get-oauth-access-token.use-case';
import { UpsertUserFromOAuthProfileUseCase } from './application/use-cases/upsert-user-from-oauth-profile/upsert-user-from-oauth-profile.use-case';
import { ConfigServiceOAuthProviderConfig } from './infrastructure/adapters/external-services/config-service-oauth-provider.config';
import { PrismaOAuthAccountsRepository } from './infrastructure/adapters/persistence/prisma-oauth-accounts.repository';
import { oauthRoutes } from './oauth.routes';

export { OAuthHttpBundle };

export interface OAuthUseCases {
  readonly bundle: OAuthHttpBundle;
  readonly upsert: UpsertUserFromOAuthProfileUseCase;
  readonly availability: CheckOAuthProviderAvailabilityUseCase;
  readonly getOAuthAccessToken: GetOAuthAccessTokenUseCase;
}

export function buildOAuthUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  config: ConfigPort,
): OAuthUseCases {
  const accounts = new PrismaOAuthAccountsRepository(prisma, logger);
  const providerConfig = new ConfigServiceOAuthProviderConfig(config);

  const upsert = new UpsertUserFromOAuthProfileUseCase(accounts, logger);
  const availability = new CheckOAuthProviderAvailabilityUseCase(providerConfig);
  const getOAuthAccessToken = new GetOAuthAccessTokenUseCase(accounts);

  const bundle: OAuthHttpBundle = { upsert, availability, config };

  return { bundle, upsert, availability, getOAuthAccessToken };
}

export function buildOAuthComposition(
  prisma: PrismaService,
  logger: LoggerPort,
  config: ConfigPort,
): BoundedContextComposition<OAuthHttpBundle> {
  const useCases = buildOAuthUseCases(prisma, logger, config);

  return {
    useCases: useCases.bundle,
    routes: oauthRoutes,
  };
}
