import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Shared providers
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
// Outbound Adapters (Infrastructure)
import {
  EMAIL_SERVICE,
  EmailVerificationSender,
  PrismaEmailVerificationRepository,
} from './adapters';
// Controllers (Inbound Adapters)
// Use Cases (Application Services)
import {
  SendVerificationController,
  SendVerificationEmailUseCase,
  VerifyEmailController,
  VerifyEmailUseCase,
} from './modules';
// Ports (Symbols for DI)
import { SEND_VERIFICATION_EMAIL_PORT, VERIFY_EMAIL_PORT } from './ports/inbound';
import type { EmailVerificationRepositoryPort } from './ports/outbound/email-verification-repository.port';
import type { VerificationEmailSenderPort } from './ports/outbound/verification-email-sender.port';

// Port symbols for outbound adapters
const EMAIL_VERIFICATION_REPOSITORY = Symbol('EmailVerificationRepositoryPort');
const VERIFICATION_EMAIL_SENDER = Symbol('VerificationEmailSenderPort');
const EVENT_BUS = Symbol('EventBusPort');

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [SendVerificationController, VerifyEmailController],
  providers: [
    // Outbound Adapters
    {
      provide: EMAIL_VERIFICATION_REPOSITORY,
      useClass: PrismaEmailVerificationRepository,
    },
    {
      provide: VERIFICATION_EMAIL_SENDER,
      useClass: EmailVerificationSender,
    },
    {
      provide: EVENT_BUS,
      useClass: NestEventBusAdapter,
    },
    // Bridge: adapts EmailService to the EmailServicePort interface expected by adapters
    {
      provide: EMAIL_SERVICE,
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
      provide: SEND_VERIFICATION_EMAIL_PORT,
      useFactory: (
        repository: EmailVerificationRepositoryPort,
        emailSender: VerificationEmailSenderPort,
        eventBus: EventBusPort,
      ) => {
        return new SendVerificationEmailUseCase(repository, emailSender, eventBus);
      },
      inject: [EMAIL_VERIFICATION_REPOSITORY, VERIFICATION_EMAIL_SENDER, EVENT_BUS],
    },
    {
      provide: VERIFY_EMAIL_PORT,
      useFactory: (repository: EmailVerificationRepositoryPort, eventBus: EventBusPort) => {
        return new VerifyEmailUseCase(repository, eventBus);
      },
      inject: [EMAIL_VERIFICATION_REPOSITORY, EVENT_BUS],
    },
  ],
  exports: [SEND_VERIFICATION_EMAIL_PORT, VERIFY_EMAIL_PORT],
})
export class EmailVerificationModule {}
