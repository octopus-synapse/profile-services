import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Shared providers
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { ALLOW_UNVERIFIED_EMAIL_KEY } from '../shared-kernel/infrastructure/decorators/allow-unverified-email.decorator';
import { EmailVerifiedGuard } from '../shared-kernel/infrastructure/guards/email-verified.guard';
import { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import { EmailVerificationUseCases } from './application/ports/email-verification.port';
import { GetResendCooldownPort } from './application/ports/get-resend-cooldown.port';
import { SendVerificationEmailPort } from './application/ports/send-verification-email.port';
import { VerifyEmailPort } from './application/ports/verify-email.port';
// Application Layer
import {
  GetResendCooldownUseCase,
  SendVerificationEmailUseCase,
  VerifyEmailUseCase,
} from './application/use-cases';
// Domain Layer
import { EmailVerificationRepositoryPort, VerificationEmailSenderPort } from './domain/ports';
import { emailVerificationRoutes } from './email-verification.routes';
// Infrastructure Layer
import {
  EmailServicePort,
  EmailVerificationSender,
  PrismaEmailVerificationRepository,
} from './infrastructure/adapters';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [
    ...synthesizeRouteControllers(EmailVerificationUseCases, emailVerificationRoutes, {
      guards: {
        // Sets `allowUnverifiedEmail` metadata on the synthesized handler
        // so the global EmailVerifiedGuard short-circuits, mirroring the
        // legacy `@AllowUnverifiedEmail()` decorator. The local
        // EmailVerifiedGuard re-runs but is idempotent — it short-circuits
        // on the same metadata read.
        'allow-unverified-email': {
          guard: EmailVerifiedGuard,
          metadataKey: ALLOW_UNVERIFIED_EMAIL_KEY,
        },
      },
    }),
  ],
  providers: [
    // Outbound Adapters
    { provide: EmailVerificationRepositoryPort, useClass: PrismaEmailVerificationRepository },
    { provide: VerificationEmailSenderPort, useClass: EmailVerificationSender },
    { provide: EventBusPort, useClass: NestEventBusAdapter },
    // Bridge: adapts EmailService to the EmailServicePort port expected by adapters
    {
      provide: EmailServicePort,
      useFactory: (emailService: EmailService) => ({
        sendEmail: async (options: {
          to: string;
          subject: string;
          template: string;
          context: Record<string, unknown>;
        }) => {
          const ctx = options.context;
          if (options.template === 'email-verification') {
            const url = ctx.verificationUrl as string;
            const token = url.includes('token=') ? url.split('token=')[1] : url;
            await emailService.sendVerificationEmail(
              options.to,
              (ctx.userName as string) || 'User',
              token,
            );
          } else {
            await emailService.sendEmail({
              to: options.to,
              subject: options.subject,
              html: `<p>${options.subject}</p>`,
            });
          }
        },
      }),
      inject: [EmailService],
    },

    // Use Cases (bound to inbound ports)
    {
      provide: SendVerificationEmailPort,
      useFactory: (
        repository: EmailVerificationRepositoryPort,
        emailSender: VerificationEmailSenderPort,
        eventBus: EventBusPort,
        logger: LoggerPort,
      ) => new SendVerificationEmailUseCase(repository, emailSender, eventBus, logger),
      inject: [
        EmailVerificationRepositoryPort,
        VerificationEmailSenderPort,
        EventBusPort,
        LoggerPort,
      ],
    },
    {
      provide: GetResendCooldownPort,
      useFactory: (repository: EmailVerificationRepositoryPort) =>
        new GetResendCooldownUseCase(repository),
      inject: [EmailVerificationRepositoryPort],
    },
    {
      provide: VerifyEmailPort,
      useFactory: (
        repository: EmailVerificationRepositoryPort,
        eventBus: EventBusPort,
        logger: LoggerPort,
      ) => new VerifyEmailUseCase(repository, eventBus, logger),
      inject: [EmailVerificationRepositoryPort, EventBusPort, LoggerPort],
    },

    // Bundle: aggregates the inbound ports into a single token consumed
    // by the synthesized route controllers. Keeps the per-port provider
    // graph intact for legacy controllers and cross-BC consumers.
    {
      provide: EmailVerificationUseCases,
      useFactory: (
        sendVerificationEmail: SendVerificationEmailPort,
        getResendCooldown: GetResendCooldownPort,
        verifyEmail: VerifyEmailPort,
      ): EmailVerificationUseCases => ({ sendVerificationEmail, getResendCooldown, verifyEmail }),
      inject: [SendVerificationEmailPort, GetResendCooldownPort, VerifyEmailPort],
    },
  ],
  exports: [SendVerificationEmailPort, GetResendCooldownPort, VerifyEmailPort],
})
export class EmailVerificationModule {}
