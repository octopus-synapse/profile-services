import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
// Shared providers
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
// Outbound Adapters (Infrastructure)
import {
  BcryptPasswordHasher,
  JwtTokenGenerator,
  PrismaAuthenticationRepository,
} from './adapters';
// Controllers (Inbound Adapters)
// Use Cases (Application Services)
import {
  LoginController,
  LoginUseCase,
  LogoutController,
  LogoutUseCase,
  RefreshTokenController,
  RefreshTokenUseCase,
} from './modules';
// Ports (Symbols for DI)
import { LOGIN_PORT, LOGOUT_PORT, REFRESH_TOKEN_PORT } from './ports/inbound';
import type { AuthenticationRepositoryPort } from './ports/outbound/authentication-repository.port';
import type { PasswordHasherPort } from './ports/outbound/password-hasher.port';
import type { TokenGeneratorPort } from './ports/outbound/token-generator.port';

// Port symbols for outbound adapters
const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const TOKEN_GENERATOR = Symbol('TokenGeneratorPort');
const EVENT_BUS = Symbol('EventBusPort');

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
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
  controllers: [LoginController, LogoutController, RefreshTokenController],
  providers: [
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

    // Use Cases (bound to inbound ports)
    {
      provide: LOGIN_PORT,
      useFactory: (
        repository: AuthenticationRepositoryPort,
        passwordHasher: PasswordHasherPort,
        tokenGenerator: TokenGeneratorPort,
        eventBus: EventBusPort,
      ) => {
        return new LoginUseCase(repository, passwordHasher, tokenGenerator, eventBus);
      },
      inject: [AUTH_REPOSITORY, PASSWORD_HASHER, TOKEN_GENERATOR, EVENT_BUS],
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
  ],
  exports: [LOGIN_PORT, LOGOUT_PORT, REFRESH_TOKEN_PORT, TOKEN_GENERATOR],
})
export class AuthenticationModule {}
