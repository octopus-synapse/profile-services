/**
 * Password Management Module
 *
 * Bounded Context for password management operations.
 * Follows Hexagonal Architecture with ports and adapters.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
// Application Ports
import {
  CHANGE_PASSWORD_PORT,
  FORGOT_PASSWORD_PORT,
  RESET_PASSWORD_PORT,
} from './application/ports';
// Application Use Cases
import {
  ChangePasswordUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
} from './application/use-cases';
// Domain Ports
import {
  PASSWORD_HASHER_PORT,
  PASSWORD_REPOSITORY_PORT,
  PASSWORD_RESET_EMAIL_PORT,
  PASSWORD_RESET_TOKEN_PORT,
  type PasswordHasherPort,
  type PasswordRepositoryPort,
  type PasswordResetEmailPort,
  type PasswordResetTokenPort,
} from './domain/ports';

// Infrastructure Adapters
import {
  BcryptPasswordHasher,
  EMAIL_SERVICE,
  EmailPasswordResetSender,
  PrismaPasswordRepository,
  PrismaPasswordResetTokenService,
} from './infrastructure/adapters';

// Infrastructure Controllers
import {
  ChangePasswordController,
  ForgotPasswordController,
  ResetPasswordController,
} from './infrastructure/controllers';

const EVENT_BUS = Symbol('EventBusPort');

const providers = [
  // Outbound Adapters (Infrastructure)
  {
    provide: PASSWORD_REPOSITORY_PORT,
    useClass: PrismaPasswordRepository,
  },
  {
    provide: PASSWORD_HASHER_PORT,
    useClass: BcryptPasswordHasher,
  },
  {
    provide: PASSWORD_RESET_TOKEN_PORT,
    useClass: PrismaPasswordResetTokenService,
  },
  {
    provide: PASSWORD_RESET_EMAIL_PORT,
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

  // Inbound Ports (Use Cases)
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
    inject: [
      PASSWORD_REPOSITORY_PORT,
      PASSWORD_RESET_TOKEN_PORT,
      PASSWORD_RESET_EMAIL_PORT,
      EVENT_BUS,
    ],
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
    inject: [PASSWORD_REPOSITORY_PORT, PASSWORD_RESET_TOKEN_PORT, PASSWORD_HASHER_PORT, EVENT_BUS],
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
    inject: [PASSWORD_REPOSITORY_PORT, PASSWORD_HASHER_PORT, EVENT_BUS],
  },
];

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [ForgotPasswordController, ResetPasswordController, ChangePasswordController],
  providers,
  exports: [FORGOT_PASSWORD_PORT, RESET_PASSWORD_PORT, CHANGE_PASSWORD_PORT],
})
export class PasswordManagementModule {}
