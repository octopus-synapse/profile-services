import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
// Shared providers
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { JwtStrategy } from '../shared-kernel/infrastructure/strategies';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import type { Validate2faInboundPort } from '../two-factor-auth/application/ports';
import { VALIDATE_2FA_INBOUND_PORT } from '../two-factor-auth/application/ports';
// Cross-BC: Two-Factor Auth
import { TwoFactorAuthModule } from '../two-factor-auth/two-factor-auth.module';

// Application Ports
import {
  CREATE_SESSION_PORT,
  LOGIN_PORT,
  LOGOUT_PORT,
  REFRESH_TOKEN_PORT,
  TERMINATE_SESSION_PORT,
  VALIDATE_SESSION_PORT,
} from './application/ports';

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
import type {
  AuthenticationRepositoryPort,
  PasswordHasherPort,
  SessionStoragePort,
  TokenGeneratorPort,
} from './domain/ports';
import { TOKEN_GENERATOR_PORT } from './domain/ports';

// Infrastructure Adapters
import {
  BcryptPasswordHasher,
  CookieSessionStorage,
  JwtTokenGenerator,
  PrismaAuthenticationRepository,
} from './infrastructure/adapters';

// Infrastructure Controllers
import {
  LoginController,
  LogoutController,
  RefreshTokenController,
  SessionController,
} from './infrastructure/controllers';

// Port symbols for outbound adapters
const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
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
      provide: TOKEN_GENERATOR_PORT,
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
        validate2fa: Validate2faInboundPort,
      ) => {
        return new LoginUseCase(repository, passwordHasher, tokenGenerator, eventBus, validate2fa);
      },
      inject: [
        AUTH_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_GENERATOR_PORT,
        EVENT_BUS,
        VALIDATE_2FA_INBOUND_PORT,
      ],
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
      inject: [AUTH_REPOSITORY, TOKEN_GENERATOR_PORT, EVENT_BUS],
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
      inject: [AUTH_REPOSITORY, TOKEN_GENERATOR_PORT, SESSION_STORAGE, EVENT_BUS, ConfigService],
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
      inject: [AUTH_REPOSITORY, TOKEN_GENERATOR_PORT, SESSION_STORAGE],
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
      inject: [TOKEN_GENERATOR_PORT, SESSION_STORAGE, EVENT_BUS],
    },
  ],
  exports: [
    LOGIN_PORT,
    LOGOUT_PORT,
    REFRESH_TOKEN_PORT,
    CREATE_SESSION_PORT,
    VALIDATE_SESSION_PORT,
    TERMINATE_SESSION_PORT,
    TOKEN_GENERATOR_PORT,
    PassportModule,
    JwtStrategy,
  ],
})
export class AuthenticationModule {}
