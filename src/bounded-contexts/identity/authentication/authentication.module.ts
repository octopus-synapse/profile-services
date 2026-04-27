import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
// Shared providers
import { NestJwtAdapter } from '@/infrastructure/nest-adapter/nest-jwt.adapter';
import { EventBusPort as SharedEventBusPort } from '@/shared-kernel';
import { JwtPort } from '@/shared-kernel/auth';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import {
  RATE_LIMIT_KEY,
  RateLimitGuard,
} from '@/bounded-contexts/platform/common/rate-limit/rate-limit.guard';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { ALLOW_UNVERIFIED_EMAIL_KEY } from '../shared-kernel/infrastructure/decorators/allow-unverified-email.decorator';
import { EmailVerifiedGuard } from '../shared-kernel/infrastructure/guards/email-verified.guard';
import { JwtStrategy } from '../shared-kernel/infrastructure/strategies';
import { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import { Validate2faInboundPort } from '../two-factor-auth/application/ports';

// Cross-BC: Two-Factor Auth
import { TwoFactorAuthModule } from '../two-factor-auth/two-factor-auth.module';
// Application Handlers (registered via EventBusPort, not provided directly).
import { registerAuthenticationHandlers } from './application/handlers/register-handlers';

// Application Ports

import { AuthenticationHttpBundle } from './application/ports/authentication-http.bundle';
import { CreateSessionPort } from './application/ports/create-session.port';
import { LoginPort } from './application/ports/login.port';
import { LogoutPort } from './application/ports/logout.port';
import { RefreshTokenPort } from './application/ports/refresh-token.port';
import { SessionDevicePort } from './application/ports/session-device.port';
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
import { authenticationRoutes } from './authentication.routes';
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
  controllers: [
    ...synthesizeRouteControllers(AuthenticationHttpBundle, authenticationRoutes, {
      guards: {
        // 2FA verify endpoint: 5 attempts/minute keyed by IP. The
        // synthesizer attaches the metadata RateLimitGuard reads.
        'rate-limit': {
          guard: RateLimitGuard,
          metadataKey: RATE_LIMIT_KEY,
        },
        // Logout must remain reachable for users with unverified email.
        // The local EmailVerifiedGuard re-runs but is idempotent — it
        // short-circuits on the same metadata read.
        'allow-unverified-email': {
          guard: EmailVerifiedGuard,
          metadataKey: ALLOW_UNVERIFIED_EMAIL_KEY,
        },
      },
    }),
  ],
  providers: [
    // JwtPort: framework-free wrapper around @nestjs/jwt's JwtService.
    {
      provide: JwtPort,
      useFactory: (jwt: JwtService) => new NestJwtAdapter(jwt),
      inject: [JwtService],
    },
    // JWT Strategy for passport auth
    JwtStrategy,
    SessionDeviceService,
    // The route bundle resolves SessionDevicePort to the concrete service.
    { provide: SessionDevicePort, useExisting: SessionDeviceService },
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
      inject: [AuthenticationRepositoryPort, TokenGeneratorPort, SessionStoragePort, LoggerPort],
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

    // Event Handlers — registered via EventBusPort by side-effect provider.
    {
      provide: 'AUTHENTICATION_HANDLERS_REGISTERED',
      useFactory: (
        eventBus: SharedEventBusPort,
        authRepository: AuthenticationRepositoryPort,
        cacheService: CacheService,
        logger: LoggerPort,
      ): boolean => {
        registerAuthenticationHandlers({ eventBus, authRepository, cacheService, logger });
        return true;
      },
      inject: [SharedEventBusPort, AuthenticationRepositoryPort, CacheService, LoggerPort],
    },

    // Aggregated bundle for the route synthesizer.
    {
      provide: AuthenticationHttpBundle,
      useFactory: (
        login: LoginPort,
        logout: LogoutPort,
        createSession: CreateSessionPort,
        validateSession: ValidateSessionPort,
        terminateSession: TerminateSessionPort,
        refreshToken: RefreshTokenPort,
        sessionDevices: SessionDevicePort,
      ): AuthenticationHttpBundle => ({
        login,
        logout,
        createSession,
        validateSession,
        terminateSession,
        refreshToken,
        sessionDevices,
      }),
      inject: [
        LoginPort,
        LogoutPort,
        CreateSessionPort,
        ValidateSessionPort,
        TerminateSessionPort,
        RefreshTokenPort,
        SessionDevicePort,
      ],
    },
  ],
  exports: [
    LoginPort,
    LogoutPort,
    RefreshTokenPort,
    CreateSessionPort,
    ValidateSessionPort,
    TerminateSessionPort,
    TokenGeneratorPort,
    JwtPort,
    PassportModule,
    JwtStrategy,
  ],
})
export class AuthenticationModule {}
