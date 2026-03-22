import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
// Shared providers
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { JwtStrategy } from '../shared-kernel/infrastructure/strategies';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
// Cross-BC: Two-Factor Auth
import { TwoFactorAuthModule } from '../two-factor-auth/two-factor-auth.module';
import { VALIDATE_2FA_PORT } from '../two-factor-auth/ports/inbound';
import type { Validate2faPort } from '../two-factor-auth/ports/inbound';
// Outbound Adapters (Infrastructure)
import {
  BcryptPasswordHasher,
  CookieSessionStorage,
  JwtTokenGenerator,
  PrismaAuthenticationRepository,
} from './adapters';
// Controllers (Inbound Adapters)
// Use Cases (Application Services)
import {
  CreateSessionUseCase,
  LoginController,
  LoginUseCase,
  LogoutController,
  LogoutUseCase,
  RefreshTokenController,
  RefreshTokenUseCase,
  SessionController,
  TerminateSessionUseCase,
  ValidateSessionUseCase,
} from './modules';
// Ports (Symbols for DI)
import {
  CREATE_SESSION_PORT,
  LOGIN_PORT,
  LOGOUT_PORT,
  REFRESH_TOKEN_PORT,
  TERMINATE_SESSION_PORT,
  VALIDATE_SESSION_PORT,
} from './ports/inbound';
import type { AuthenticationRepositoryPort } from './ports/outbound/authentication-repository.port';
import type { PasswordHasherPort } from './ports/outbound/password-hasher.port';
import type { SessionStoragePort } from './ports/outbound/session-storage.port';
import type { TokenGeneratorPort } from './ports/outbound/token-generator.port';

// Port symbols for outbound adapters
const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const TOKEN_GENERATOR = Symbol('TokenGeneratorPort');
const SESSION_STORAGE = Symbol('SessionStoragePort');
const EVENT_BUS = Symbol('EventBusPort');

@Module({
  imports: [
    PrismaModule,
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
    // Outbound Adapters
    {
      provide: AUTH_REPOSITORY,
      useClass: PrismaAuthenticationRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_GENERATOR,
      useClass: JwtTokenGenerator,
    },
    {
      provide: EVENT_BUS,
      useClass: NestEventBusAdapter,
    },
    {
      provide: SESSION_STORAGE,
      useClass: CookieSessionStorage,
    },

    // Use Cases (bound to inbound ports)
    {
      provide: LOGIN_PORT,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        passwordHasher: PasswordHasherPort,
        tokenGenerator: TokenGeneratorPort,
        eventBus: EventBusPort,
        validate2fa: Validate2faPort,
      ) => {
        return new LoginUseCase(repository, passwordHasher, tokenGenerator, eventBus, validate2fa);
      },
      inject: [AUTH_REPOSITORY, PASSWORD_HASHER, TOKEN_GENERATOR, EVENT_BUS, VALIDATE_2FA_PORT],
    },
    {
      provide: LOGOUT_PORT,
      useFactory: (repository: AuthenticationRepositoryPort, eventBus: EventBusPort) => {
        return new LogoutUseCase(repository, eventBus);
      },
      inject: [AUTH_REPOSITORY, EVENT_BUS],
    },
    {
      provide: REFRESH_TOKEN_PORT,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        tokenGenerator: TokenGeneratorPort,
        eventBus: EventBusPort,
      ) => {
        return new RefreshTokenUseCase(repository, tokenGenerator, eventBus);
      },
      inject: [AUTH_REPOSITORY, TOKEN_GENERATOR, EVENT_BUS],
    },

    // Session Use Cases
    {
      provide: CREATE_SESSION_PORT,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        tokenGenerator: TokenGeneratorPort,
        sessionStorage: SessionStoragePort,
        eventBus: EventBusPort,
        configService: ConfigService,
      ) => {
        return new CreateSessionUseCase(
          repository,
          tokenGenerator,
          sessionStorage,
          eventBus,
          configService,
        );
      },
      inject: [AUTH_REPOSITORY, TOKEN_GENERATOR, SESSION_STORAGE, EVENT_BUS, ConfigService],
    },
    {
      provide: VALIDATE_SESSION_PORT,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        tokenGenerator: TokenGeneratorPort,
        sessionStorage: SessionStoragePort,
      ) => {
        return new ValidateSessionUseCase(repository, tokenGenerator, sessionStorage);
      },
      inject: [AUTH_REPOSITORY, TOKEN_GENERATOR, SESSION_STORAGE],
    },
    {
      provide: TERMINATE_SESSION_PORT,
      useFactory: (
        tokenGenerator: TokenGeneratorPort,
        sessionStorage: SessionStoragePort,
        eventBus: EventBusPort,
      ) => {
        return new TerminateSessionUseCase(tokenGenerator, sessionStorage, eventBus);
      },
      inject: [TOKEN_GENERATOR, SESSION_STORAGE, EVENT_BUS],
    },
  ],
  exports: [
    LOGIN_PORT,
    LOGOUT_PORT,
    REFRESH_TOKEN_PORT,
    CREATE_SESSION_PORT,
    VALIDATE_SESSION_PORT,
    TERMINATE_SESSION_PORT,
    TOKEN_GENERATOR,
    PassportModule,
    JwtStrategy,
  ],
})
export class AuthenticationModule {}
