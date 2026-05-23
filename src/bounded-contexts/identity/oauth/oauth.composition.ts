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
import type { OAuthPort } from '@/shared-kernel/auth/oauth.port';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import { AesGcmCipher, type CipherPort, NoopCipher } from '@/shared-kernel/crypto';
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
  oauth: OAuthPort,
): OAuthUseCases {
  // P0-#6: encrypt 3rd-party OAuth tokens at rest. Real AES key in production
  // (ConfigPort enforces 32 raw bytes / base64); NoopCipher in dev to keep
  // local boot frictionless. The composition root MUST set the env var on
  // any deploy that lets real users connect external OAuth providers.
  const encKeyB64 = config.get<string>('TOKEN_ENCRYPTION_KEY');
  const cipher: CipherPort = encKeyB64
    ? new AesGcmCipher(Buffer.from(encKeyB64, 'base64'))
    : new NoopCipher();

  const accounts = new PrismaOAuthAccountsRepository(prisma, logger, cipher);
  const providerConfig = new ConfigServiceOAuthProviderConfig(config);

  const upsert = new UpsertUserFromOAuthProfileUseCase(accounts, logger);
  const availability = new CheckOAuthProviderAvailabilityUseCase(providerConfig);
  const getOAuthAccessToken = new GetOAuthAccessTokenUseCase(accounts);

  const bundle: OAuthHttpBundle = { upsert, availability, config, oauth };

  return { bundle, upsert, availability, getOAuthAccessToken };
}

export function buildOAuthComposition(
  prisma: PrismaService,
  logger: LoggerPort,
  config: ConfigPort,
  oauth: OAuthPort,
): BoundedContextComposition<OAuthHttpBundle> {
  const useCases = buildOAuthUseCases(prisma, logger, config, oauth);

  return {
    useCases: useCases.bundle,
    routes: oauthRoutes,
  };
}
