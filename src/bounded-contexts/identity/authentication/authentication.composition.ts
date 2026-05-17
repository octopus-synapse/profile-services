/**
 * Pure-TS wiring for the identity/authentication BC. Zero `@nestjs/*`
 * imports. The Nest module shell consumes `buildAuthenticationUseCases`
 * via `useFactory`; the Elysia path uses the same composition.
 *
 * Cross-BC dependencies passed in:
 *  - `validate2fa` (two-factor-auth BC) — login flow.
 *  - `cacheService`, `eventBus` (platform / identity shared-kernel).
 *  - `jwt` (JwtPort wrapper around @nestjs/jwt's JwtService — adapter
 *    lives in the Nest shell; Elysia adapter implements the same port).
 *
 * The Passport `JwtStrategy` and the global guards stay framework-
 * coupled and live in the Nest module shell — they're not part of this
 * composition.
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort, EventBusPort as SharedEventBusPort } from '@/shared-kernel';
import type { JwtPort } from '@/shared-kernel/auth';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import type { Validate2faInboundPort } from '../two-factor-auth/application/ports';
import { registerAuthenticationHandlers } from './application/handlers/register-handlers';
import { AuthenticationHttpBundle } from './application/ports/authentication-http.bundle';
import {
  CreateSessionUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  TerminateSessionUseCase,
  ValidateSessionUseCase,
} from './application/use-cases';
import { authenticationRoutes } from './authentication.routes';
import {
  BcryptPasswordHasher,
  CookieSessionStorage,
  JwtTokenGenerator,
  PrismaAuthenticationRepository,
} from './infrastructure/adapters';
import { PrismaLoginAttemptsAdapter } from './infrastructure/adapters/prisma-login-attempts.adapter';
import { SessionDeviceService } from './infrastructure/adapters/session-device.adapter';

export { AuthenticationHttpBundle };

export interface AuthenticationUseCases {
  readonly bundle: AuthenticationHttpBundle;
  readonly login: LoginUseCase;
  readonly logout: LogoutUseCase;
  readonly refreshToken: RefreshTokenUseCase;
  readonly createSession: CreateSessionUseCase;
  readonly validateSession: ValidateSessionUseCase;
  readonly terminateSession: TerminateSessionUseCase;
  readonly tokenGenerator: JwtTokenGenerator;
  readonly authRepository: PrismaAuthenticationRepository;
  readonly sessionStorage: CookieSessionStorage;
  readonly sessionDevices: SessionDeviceService;
  /** P1 #2 / #12 — exposed so the bootstrap can hand the lockout
   *  status reader to the HTTP pipeline (auth-lockout stage). */
  readonly loginAttempts: PrismaLoginAttemptsAdapter;
}

export function buildAuthenticationUseCases(
  prisma: PrismaService,
  cache: CacheService,
  config: ConfigPort,
  jwt: JwtPort,
  eventBus: EventBusPort,
  sharedEventBus: SharedEventBusPort,
  validate2fa: Validate2faInboundPort,
  logger: LoggerPort,
): AuthenticationUseCases {
  // Outbound adapters
  const authRepository = new PrismaAuthenticationRepository(prisma, cache);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenGenerator = new JwtTokenGenerator(jwt, config);
  const sessionStorage = new CookieSessionStorage(config);
  const loginAttempts = new PrismaLoginAttemptsAdapter(prisma, config);
  const sessionDevices = new SessionDeviceService(prisma);

  // Use cases
  const login = new LoginUseCase(
    authRepository,
    passwordHasher,
    tokenGenerator,
    eventBus,
    validate2fa,
    loginAttempts,
    logger,
  );
  const logout = new LogoutUseCase(authRepository, eventBus, logger);
  const refreshToken = new RefreshTokenUseCase(authRepository, tokenGenerator, eventBus, logger);
  const createSession = new CreateSessionUseCase(
    authRepository,
    tokenGenerator,
    sessionStorage,
    eventBus,
    { get: <T>(key: string, defaultValue: T) => config.getOrDefault<T>(key, defaultValue) },
    logger,
  );
  const validateSession = new ValidateSessionUseCase(
    authRepository,
    tokenGenerator,
    sessionStorage,
    logger,
    config,
  );
  const terminateSession = new TerminateSessionUseCase(
    tokenGenerator,
    sessionStorage,
    eventBus,
    logger,
  );

  // Register cross-BC event handlers (idempotent at module init).
  registerAuthenticationHandlers({
    eventBus: sharedEventBus,
    authRepository,
    cacheService: cache,
    logger,
  });

  const bundle: AuthenticationHttpBundle = {
    login,
    logout,
    createSession,
    validateSession,
    terminateSession,
    refreshToken,
    sessionDevices,
  };

  return {
    bundle,
    login,
    logout,
    refreshToken,
    createSession,
    validateSession,
    terminateSession,
    tokenGenerator,
    authRepository,
    sessionStorage,
    sessionDevices,
    loginAttempts,
  };
}

export function buildAuthenticationComposition(
  prisma: PrismaService,
  cache: CacheService,
  config: ConfigPort,
  jwt: JwtPort,
  eventBus: EventBusPort,
  sharedEventBus: SharedEventBusPort,
  validate2fa: Validate2faInboundPort,
  logger: LoggerPort,
): BoundedContextComposition<AuthenticationHttpBundle> {
  const useCases = buildAuthenticationUseCases(
    prisma,
    cache,
    config,
    jwt,
    eventBus,
    sharedEventBus,
    validate2fa,
    logger,
  );

  return {
    useCases: useCases.bundle,
    routes: authenticationRoutes,
  };
}
