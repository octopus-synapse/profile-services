/**
 * Pure-TS wiring for the identity/email-verification BC. Zero
 * `@nestjs/*` imports. The Nest module shell consumes this composition
 * via `useFactory`; the Elysia path uses the same wiring.
 *
 * Cross-BC dependencies passed in:
 *  - `eventBus` — identity shared-kernel.
 *  - `emailService` — adapter conforming to the BC's `EmailServicePort`
 *    (the platform `EmailService` is bridged inside the module shell).
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import { EmailVerificationUseCases } from './application/ports/email-verification.port';
import {
  ConfirmPreSignupVerificationUseCase,
  GetResendCooldownUseCase,
  SendVerificationEmailUseCase,
  StartPreSignupVerificationUseCase,
  VerifyEmailUseCase,
} from './application/use-cases';
import { emailVerificationRoutes } from './email-verification.routes';
import {
  CachePreSignupVerificationStore,
  EmailServicePort,
  EmailVerificationSender,
  PrismaEmailVerificationRepository,
  SignedRegistrationTokenIssuer,
} from './infrastructure/adapters';

export { EmailServicePort, EmailVerificationUseCases };

export function buildEmailVerificationUseCases(
  prisma: PrismaService,
  emailService: EmailServicePort,
  config: ConfigPort,
  eventBus: EventBusPort,
  cache: CacheService,
  logger: LoggerPort,
): EmailVerificationUseCases {
  const repository = new PrismaEmailVerificationRepository(prisma);
  const emailSender = new EmailVerificationSender(emailService, config);
  const preSignupStore = new CachePreSignupVerificationStore(cache);
  // Registration tokens ride the JWT secret — same trust domain, and a
  // rotation invalidates in-flight signups gracefully (30min TTL).
  const registrationTokenIssuer = new SignedRegistrationTokenIssuer(config.env.JWT_SECRET);

  return {
    sendVerificationEmail: new SendVerificationEmailUseCase(
      repository,
      emailSender,
      eventBus,
      logger,
      config.env,
    ),
    getResendCooldown: new GetResendCooldownUseCase(repository),
    verifyEmail: new VerifyEmailUseCase(repository, eventBus, logger),
    startPreSignupVerification: new StartPreSignupVerificationUseCase(
      repository,
      preSignupStore,
      emailSender,
      logger,
      config.env,
    ),
    confirmPreSignupVerification: new ConfirmPreSignupVerificationUseCase(
      preSignupStore,
      registrationTokenIssuer,
      logger,
    ),
  };
}

export function buildEmailVerificationComposition(
  prisma: PrismaService,
  emailService: EmailServicePort,
  config: ConfigPort,
  eventBus: EventBusPort,
  cache: CacheService,
  logger: LoggerPort,
): BoundedContextComposition<EmailVerificationUseCases> {
  const useCases = buildEmailVerificationUseCases(
    prisma,
    emailService,
    config,
    eventBus,
    cache,
    logger,
  );

  return {
    useCases,
    routes: emailVerificationRoutes,
  };
}
