/**
 * OAuth Module
 *
 * ADR-001: passport strategies stay registered (they're framework
 * adapters); the controller goes through three POJO use cases:
 *   - `UpsertUserFromOAuthProfileUseCase` for the callback handoff
 *   - `CheckOAuthProviderAvailabilityUseCase` for `/available/:provider`
 *   - `GetOAuthAccessTokenUseCase` exposed for the import BC
 *
 * Persistence is behind `OAuthAccountsRepositoryPort` (Prisma adapter)
 * and provider config is behind `OAuthProviderConfigPort`
 * (`ConfigService` adapter), so the use cases never touch Nest config
 * or Prisma directly.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { CheckOAuthProviderAvailabilityUseCase } from './application/use-cases/check-oauth-provider-availability/check-oauth-provider-availability.use-case';
import { GetOAuthAccessTokenUseCase } from './application/use-cases/get-oauth-access-token/get-oauth-access-token.use-case';
import { UpsertUserFromOAuthProfileUseCase } from './application/use-cases/upsert-user-from-oauth-profile/upsert-user-from-oauth-profile.use-case';
import { OAuthAccountsRepositoryPort } from './domain/ports/oauth-accounts.repository.port';
import { OAuthProviderConfigPort } from './domain/ports/oauth-provider-config.port';
import { ConfigServiceOAuthProviderConfig } from './infrastructure/adapters/external-services/config-service-oauth-provider.config';
import { PrismaOAuthAccountsRepository } from './infrastructure/adapters/persistence/prisma-oauth-accounts.repository';
import { OAuthController } from './infrastructure/controllers/oauth.controller';
import { GithubOAuthStrategy } from './strategies/github.strategy';
import { LinkedinOAuthStrategy } from './strategies/linkedin.strategy';

@Module({
  imports: [ConfigModule, PassportModule, PrismaModule],
  controllers: [OAuthController],
  providers: [
    {
      provide: OAuthAccountsRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaOAuthAccountsRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: OAuthProviderConfigPort,
      useFactory: (config: ConfigService) => new ConfigServiceOAuthProviderConfig(config),
      inject: [ConfigService],
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
  ],
  exports: [GetOAuthAccessTokenUseCase],
})
export class OAuthModule {}
