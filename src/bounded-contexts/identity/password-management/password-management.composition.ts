/**
 * Pure-TS wiring for the identity/password-management BC. Zero
 * `@nestjs/*` imports. The Nest module shell consumes this composition
 * via `useFactory`; the Elysia path uses the same wiring.
 *
 * Cross-BC dependencies passed in:
 *  - `eventBus` — identity shared-kernel.
 *  - `cache` — platform cache (used by `SessionInvalidationAdapter`).
 *  - `emailService` — adapter conforming to the BC's `EmailServicePort`
 *    (the platform `EmailService` is bridged inside the module shell).
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import { PasswordManagementUseCases } from './application/ports/password-management.port';
import {
  ChangePasswordUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
} from './application/use-cases';
import {
  BcryptPasswordHasher,
  EmailPasswordResetSender,
  EmailServicePort,
  PrismaPasswordRepository,
  PrismaPasswordResetTokenService,
  SessionInvalidationAdapter,
} from './infrastructure/adapters';
import { passwordManagementRoutes } from './password-management.routes';

export { EmailServicePort, PasswordManagementUseCases };

export function buildPasswordManagementUseCases(
  prisma: PrismaService,
  cache: CacheService,
  emailService: EmailServicePort,
  config: ConfigPort,
  eventBus: EventBusPort,
  logger: LoggerPort,
): PasswordManagementUseCases {
  const passwordRepository = new PrismaPasswordRepository(prisma);
  // P1-#A1-17: cost from validated `EnvConfigSchema.BCRYPT_COST`.
  const passwordHasher = new BcryptPasswordHasher(config.env.BCRYPT_COST);
  const tokenService = new PrismaPasswordResetTokenService(prisma);
  const emailSender = new EmailPasswordResetSender(emailService, config);
  const sessionInvalidation = new SessionInvalidationAdapter(cache, prisma);

  return {
    changePassword: new ChangePasswordUseCase(
      passwordRepository,
      passwordHasher,
      sessionInvalidation,
      eventBus,
      logger,
    ),
    forgotPassword: new ForgotPasswordUseCase(
      passwordRepository,
      tokenService,
      emailSender,
      eventBus,
      logger,
    ),
    resetPassword: new ResetPasswordUseCase(
      passwordRepository,
      tokenService,
      passwordHasher,
      sessionInvalidation,
      eventBus,
      logger,
    ),
  };
}

export function buildPasswordManagementComposition(
  prisma: PrismaService,
  cache: CacheService,
  emailService: EmailServicePort,
  config: ConfigPort,
  eventBus: EventBusPort,
  logger: LoggerPort,
): BoundedContextComposition<PasswordManagementUseCases> {
  const useCases = buildPasswordManagementUseCases(
    prisma,
    cache,
    emailService,
    config,
    eventBus,
    logger,
  );

  return {
    useCases,
    routes: passwordManagementRoutes,
  };
}
