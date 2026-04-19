import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { OAuthController } from './controllers/oauth.controller';
import { OAuthService } from './services/oauth.service';
import { GithubOAuthStrategy } from './strategies/github.strategy';
import { LinkedinOAuthStrategy } from './strategies/linkedin.strategy';

/**
 * OAuth module. Strategies are registered unconditionally; they only *run*
 * when a request hits `/auth/oauth/:provider/start|/callback`, and the
 * controller short-circuits with ServiceUnavailable when the provider's
 * CLIENT_ID/SECRET are absent.
 */
@Module({
  imports: [ConfigModule, PassportModule, PrismaModule],
  controllers: [OAuthController],
  providers: [
    OAuthService,
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
  exports: [OAuthService],
})
export class OAuthModule {}
