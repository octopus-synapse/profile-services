import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
// Shared providers
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { LoggerPort } from '@/shared-kernel';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { JwtStrategy } from '../shared-kernel/infrastructure/strategies';
import { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import { Validate2faInboundPort } from '../two-factor-auth/application/ports';

// Cross-BC: Two-Factor Auth
import { TwoFactorAuthModule } from '../two-factor-auth/two-factor-auth.module';
// Application Handlers
import { InvalidateSessionsOnCredentialChangeHandler } from './application/handlers/invalidate-sessions-on-credential-change.handler';

// Application Ports

import { CreateSessionPort } from './application/ports/create-session.port';
import { LoginPort } from './application/ports/login.port';
import { LogoutPort } from './application/ports/logout.port';
import { RefreshTokenPort } from './application/ports/refresh-token.port';
import { TerminateSessionPort } from './application/ports/terminate-session.port';
import { ValidateSessionPort } from './application/ports/validate-session.port';
// Application Use Cases
import {
  CreateSessionUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  TerminateSessionUseCase,
  ValidateSessionUseCase,
} from './application/use-cases';
// Domain Ports
import {
  AuthenticationRepositoryPort,
  LoginAttemptsPort,
  PasswordHasherPort,
  SessionStoragePort,
  TokenGeneratorPort,
} from './domain/ports';
// Infrastructure Adapters
import {
  BcryptPasswordHasher,
  CookieSessionStorage,
  JwtTokenGenerator,
  PrismaAuthenticationRepository,
} from './infrastructure/adapters';
import { PrismaLoginAttemptsAdapter } from './infrastructure/adapters/prisma-login-attempts.adapter';
import { SessionDeviceService } from './infrastructure/adapters/session-device.service';
// Infrastructure Controllers
import {
  LoginController,
  LogoutController,
  RefreshTokenController,
  SessionController,
} from './infrastructure/controllers';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    RateLimitModule,
    ConfigModule,
    TwoFactorAuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') ??
            '1h') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LoginController, LogoutController, RefreshTokenController, SessionController],
  providers: [
    // JWT Strategy for passport auth
    JwtStrategy,
    SessionDeviceService,
    // Outbound Adapters
    { provide: AuthenticationRepositoryPort, useClass: PrismaAuthenticationRepository },
    { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
    { provide: TokenGeneratorPort, useClass: JwtTokenGenerator },
    { provide: EventBusPort, useClass: NestEventBusAdapter },
    { provide: SessionStoragePort, useClass: CookieSessionStorage },
    { provide: LoginAttemptsPort, useClass: PrismaLoginAttemptsAdapter },

    // Use Cases (bound to inbound ports)
    {
      provide: LoginPort,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        passwordHasher: PasswordHasherPort,
        tokenGenerator: TokenGeneratorPort,
        eventBus: EventBusPort,
        validate2fa: Validate2faInboundPort,
        loginAttempts: LoginAttemptsPort,
        logger: LoggerPort,
      ) => {
        return new LoginUseCase(
          repository,
          passwordHasher,
          tokenGenerator,
          eventBus,
          validate2fa,
          loginAttempts,
          logger,
        );
      },
      inject: [
        AuthenticationRepositoryPort,
        PasswordHasherPort,
        TokenGeneratorPort,
        EventBusPort,
        Validate2faInboundPort,
        LoginAttemptsPort,
        LoggerPort,
      ],
    },
    {
      provide: LogoutPort,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        eventBus: EventBusPort,
        logger: LoggerPort,
      ) => {
        return new LogoutUseCase(repository, eventBus, logger);
      },
      inject: [AuthenticationRepositoryPort, EventBusPort, LoggerPort],
    },
    {
      provide: RefreshTokenPort,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        tokenGenerator: TokenGeneratorPort,
        eventBus: EventBusPort,
        logger: LoggerPort,
      ) => {
        return new RefreshTokenUseCase(repository, tokenGenerator, eventBus, logger);
      },
      inject: [AuthenticationRepositoryPort, TokenGeneratorPort, EventBusPort, LoggerPort],
    },

    // Session Use Cases
    {
      provide: CreateSessionPort,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        tokenGenerator: TokenGeneratorPort,
        sessionStorage: SessionStoragePort,
        eventBus: EventBusPort,
        configService: ConfigService,
        logger: LoggerPort,
      ) => {
        return new CreateSessionUseCase(
          repository,
          tokenGenerator,
          sessionStorage,
          eventBus,
          configService,
          logger,
        );
      },
      inject: [
        AuthenticationRepositoryPort,
        TokenGeneratorPort,
        SessionStoragePort,
        EventBusPort,
        ConfigService,
        LoggerPort,
      ],
    },
    {
      provide: ValidateSessionPort,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        tokenGenerator: TokenGeneratorPort,
        sessionStorage: SessionStoragePort,
        logger: LoggerPort,
      ) => {
        return new ValidateSessionUseCase(repository, tokenGenerator, sessionStorage, logger);
      },
      inject: [
        AuthenticationRepositoryPort,
        TokenGeneratorPort,
        SessionStoragePort,
        LoggerPort,
      ],
    },
    {
      provide: TerminateSessionPort,
      useFactory: (
        tokenGenerator: TokenGeneratorPort,
        sessionStorage: SessionStoragePort,
        eventBus: EventBusPort,
        logger: LoggerPort,
      ) => {
        return new TerminateSessionUseCase(tokenGenerator, sessionStorage, eventBus, logger);
      },
      inject: [TokenGeneratorPort, SessionStoragePort, EventBusPort, LoggerPort],
    },

    // Event Handlers
    InvalidateSessionsOnCredentialChangeHandler,
  ],
  exports: [
    LoginPort,
    LogoutPort,
    RefreshTokenPort,
    CreateSessionPort,
    ValidateSessionPort,
    TerminateSessionPort,
    TokenGeneratorPort,
    PassportModule,
    JwtStrategy,
  ],
})
export class AuthenticationModule {}
