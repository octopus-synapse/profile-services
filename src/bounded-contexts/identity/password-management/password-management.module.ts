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
  BcryptPasswordHasher,
  EMAIL_SERVICE,
  EmailPasswordResetSender,
  PrismaPasswordRepository,
  PrismaPasswordResetTokenService,
} from './adapters';
// Controllers (Inbound Adapters)
// Use Cases (Application Services)
import {
  ChangePasswordController,
  ChangePasswordUseCase,
  ForgotPasswordController,
  ForgotPasswordUseCase,
  ResetPasswordController,
  ResetPasswordUseCase,
} from './modules';
// Ports (Symbols for DI)
import { CHANGE_PASSWORD_PORT, FORGOT_PASSWORD_PORT, RESET_PASSWORD_PORT } from './ports/inbound';
import type {
  PasswordHasherPort,
  PasswordRepositoryPort,
  PasswordResetEmailPort,
  PasswordResetTokenPort,
} from './ports/outbound';

// Port symbols for outbound adapters
const PASSWORD_REPOSITORY = Symbol('PasswordRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const TOKEN_SERVICE = Symbol('PasswordResetTokenPort');
const PASSWORD_EMAIL_SENDER = Symbol('PasswordResetEmailPort');
const EVENT_BUS = Symbol('EventBusPort');

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [ForgotPasswordController, ResetPasswordController, ChangePasswordController],
  providers: [
    // Outbound Adapters
    {
      provide: PASSWORD_REPOSITORY,
      useClass: PrismaPasswordRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: PrismaPasswordResetTokenService,
    },
    {
      provide: PASSWORD_EMAIL_SENDER,
      useClass: EmailPasswordResetSender,
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
          if (options.template === 'password-reset') {
            const url = ctx.resetUrl as string;
            const token = url.includes('token=') ? url.split('token=')[1] : url;
            await emailService.sendPasswordResetEmail(
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
      provide: FORGOT_PASSWORD_PORT,
      useFactory: (
        passwordRepository: PasswordRepositoryPort,
        tokenService: PasswordResetTokenPort,
        emailSender: PasswordResetEmailPort,
        eventBus: EventBusPort,
      ) => {
        return new ForgotPasswordUseCase(passwordRepository, tokenService, emailSender, eventBus);
      },
      inject: [PASSWORD_REPOSITORY, TOKEN_SERVICE, PASSWORD_EMAIL_SENDER, EVENT_BUS],
    },
    {
      provide: RESET_PASSWORD_PORT,
      useFactory: (
        passwordRepository: PasswordRepositoryPort,
        tokenService: PasswordResetTokenPort,
        passwordHasher: PasswordHasherPort,
        eventBus: EventBusPort,
      ) => {
        return new ResetPasswordUseCase(passwordRepository, tokenService, passwordHasher, eventBus);
      },
      inject: [PASSWORD_REPOSITORY, TOKEN_SERVICE, PASSWORD_HASHER, EVENT_BUS],
    },
    {
      provide: CHANGE_PASSWORD_PORT,
      useFactory: (
        passwordRepository: PasswordRepositoryPort,
        passwordHasher: PasswordHasherPort,
        eventBus: EventBusPort,
      ) => {
        return new ChangePasswordUseCase(passwordRepository, passwordHasher, eventBus);
      },
      inject: [PASSWORD_REPOSITORY, PASSWORD_HASHER, EVENT_BUS],
    },
  ],
  exports: [FORGOT_PASSWORD_PORT, RESET_PASSWORD_PORT, CHANGE_PASSWORD_PORT],
})
export class PasswordManagementModule {}
