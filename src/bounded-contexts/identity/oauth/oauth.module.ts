/**
 * OAuth Module
 *
 * Thin Nest shell. Use-cases compose via `useFactory`; routes are
 * synthesized from `oauth.routes.ts` and mounted via the new guard
 * registry that maps `'oauth-github'`/`'oauth-linkedin'` to the
 * Passport-backed `AuthGuard('github'|'linkedin')` wrappers. Passport
 * strategies stay registered (framework adapters).
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigPort } from '@/shared-kernel/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { OAuthHttpBundle } from './application/ports/oauth-http.bundle';
import { CheckOAuthProviderAvailabilityUseCase } from './application/use-cases/check-oauth-provider-availability/check-oauth-provider-availability.use-case';
import { GetOAuthAccessTokenUseCase } from './application/use-cases/get-oauth-access-token/get-oauth-access-token.use-case';
import { UpsertUserFromOAuthProfileUseCase } from './application/use-cases/upsert-user-from-oauth-profile/upsert-user-from-oauth-profile.use-case';
import { OAuthAccountsRepositoryPort } from './domain/ports/oauth-accounts.repository.port';
import { OAuthProviderConfigPort } from './domain/ports/oauth-provider-config.port';
import { ConfigServiceOAuthProviderConfig } from './infrastructure/adapters/external-services/config-service-oauth-provider.config';
import {
  GithubOAuthGuard,
  LinkedinOAuthGuard,
} from './infrastructure/guards/passport-oauth.guards';
import { PrismaOAuthAccountsRepository } from './infrastructure/adapters/persistence/prisma-oauth-accounts.repository';
import { oauthRoutes } from './oauth.routes';
import { GithubOAuthStrategy } from './strategies/github.strategy';
import { LinkedinOAuthStrategy } from './strategies/linkedin.strategy';

@Module({
  imports: [ConfigModule, PassportModule, PrismaModule],
  controllers: synthesizeRouteControllers(OAuthHttpBundle, oauthRoutes, {
    guards: {
      'oauth-github': { guard: GithubOAuthGuard },
      'oauth-linkedin': { guard: LinkedinOAuthGuard },
    },
  }),
  providers: [
    GithubOAuthGuard,
    LinkedinOAuthGuard,
    {
      provide: OAuthAccountsRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaOAuthAccountsRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: OAuthProviderConfigPort,
      useFactory: (config: ConfigPort) => new ConfigServiceOAuthProviderConfig(config),
      inject: [ConfigPort],
    },
    {
      provide: UpsertUserFromOAuthProfileUseCase,
      useFactory: (accounts: OAuthAccountsRepositoryPort, logger: LoggerPort) =>
        new UpsertUserFromOAuthProfileUseCase(accounts, logger),
      inject: [OAuthAccountsRepositoryPort, LoggerPort],
    },
    {
      provide: CheckOAuthProviderAvailabilityUseCase,
      useFactory: (config: OAuthProviderConfigPort) =>
        new CheckOAuthProviderAvailabilityUseCase(config),
      inject: [OAuthProviderConfigPort],
    },
    {
      provide: GetOAuthAccessTokenUseCase,
      useFactory: (accounts: OAuthAccountsRepositoryPort) =>
        new GetOAuthAccessTokenUseCase(accounts),
      inject: [OAuthAccountsRepositoryPort],
    },
    {
      provide: GithubOAuthStrategy,
      useFactory: (cfg: ConfigService) => new GithubOAuthStrategy(cfg),
      inject: [ConfigService],
    },
    {
      provide: LinkedinOAuthStrategy,
      useFactory: (cfg: ConfigService) => new LinkedinOAuthStrategy(cfg),
      inject: [ConfigService],
    },
    {
      provide: OAuthHttpBundle,
      useFactory: (
        upsert: UpsertUserFromOAuthProfileUseCase,
        availability: CheckOAuthProviderAvailabilityUseCase,
        config: ConfigPort,
      ): OAuthHttpBundle => ({ upsert, availability, config }),
      inject: [
        UpsertUserFromOAuthProfileUseCase,
        CheckOAuthProviderAvailabilityUseCase,
        ConfigPort,
      ],
    },
  ],
  exports: [GetOAuthAccessTokenUseCase],
})
export class OAuthModule {}
