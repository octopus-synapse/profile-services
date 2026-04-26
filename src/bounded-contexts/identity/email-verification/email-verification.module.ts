import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Shared providers
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { EventBusPort } from '../shared-kernel/ports/event-bus.port';
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
// Infrastructure Layer
import {
  EmailServicePort,
  EmailVerificationSender,
  PrismaEmailVerificationRepository,
} from './infrastructure/adapters';
import { SendVerificationController, VerifyEmailController } from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [SendVerificationController, VerifyEmailController],
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
      ) => new SendVerificationEmailUseCase(repository, emailSender, eventBus),
      inject: [EmailVerificationRepositoryPort, VerificationEmailSenderPort, EventBusPort],
    },
    {
      provide: GetResendCooldownPort,
      useFactory: (repository: EmailVerificationRepositoryPort) =>
        new GetResendCooldownUseCase(repository),
      inject: [EmailVerificationRepositoryPort],
    },
    {
      provide: VerifyEmailPort,
      useFactory: (repository: EmailVerificationRepositoryPort, eventBus: EventBusPort) =>
        new VerifyEmailUseCase(repository, eventBus),
      inject: [EmailVerificationRepositoryPort, EventBusPort],
    },
  ],
  exports: [SendVerificationEmailPort, GetResendCooldownPort, VerifyEmailPort],
})
export class EmailVerificationModule {}
