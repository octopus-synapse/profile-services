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

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import { EmailVerificationUseCases } from './application/ports/email-verification.port';
import {
  GetResendCooldownUseCase,
  SendVerificationEmailUseCase,
  VerifyEmailUseCase,
} from './application/use-cases';
import { emailVerificationRoutes } from './email-verification.routes';
import {
  EmailServicePort,
  EmailVerificationSender,
  PrismaEmailVerificationRepository,
} from './infrastructure/adapters';

export { EmailServicePort, EmailVerificationUseCases };

export function buildEmailVerificationUseCases(
  prisma: PrismaService,
  emailService: EmailServicePort,
  config: ConfigPort,
  eventBus: EventBusPort,
  logger: LoggerPort,
): EmailVerificationUseCases {
  const repository = new PrismaEmailVerificationRepository(prisma);
  const emailSender = new EmailVerificationSender(emailService, config);

  return {
    sendVerificationEmail: new SendVerificationEmailUseCase(
      repository,
      emailSender,
      eventBus,
      logger,
    ),
    getResendCooldown: new GetResendCooldownUseCase(repository),
    verifyEmail: new VerifyEmailUseCase(repository, eventBus, logger),
  };
}

export function buildEmailVerificationComposition(
  prisma: PrismaService,
  emailService: EmailServicePort,
  config: ConfigPort,
  eventBus: EventBusPort,
  logger: LoggerPort,
): BoundedContextComposition<EmailVerificationUseCases> {
  const useCases = buildEmailVerificationUseCases(prisma, emailService, config, eventBus, logger);

  return {
    useCases,
    routes: emailVerificationRoutes,
  };
}
