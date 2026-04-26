/**
 * Password Management Module
 *
 * Bounded Context for password management operations.
 * Follows Hexagonal Architecture with ports and adapters.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { LoggerPort } from '@/shared-kernel';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { EventBusPort } from '../shared-kernel/ports/event-bus.port';

// Application Ports

import { ChangePasswordPort } from './application/ports/change-password.port';
import { ForgotPasswordPort } from './application/ports/forgot-password.port';
import { ResetPasswordPort } from './application/ports/reset-password.port';
// Application Use Cases
import {
  ChangePasswordUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
} from './application/use-cases';
// Domain Ports
import {
  PasswordHasherPort,
  PasswordRepositoryPort,
  PasswordResetEmailPort,
  PasswordResetTokenPort,
  SessionInvalidationPort,
} from './domain/ports';
// Infrastructure Adapters
import {
  BcryptPasswordHasher,
  EmailPasswordResetSender,
  EmailServicePort,
  PrismaPasswordRepository,
  PrismaPasswordResetTokenService,
  SessionInvalidationAdapter,
} from './infrastructure/adapters';
// Infrastructure Controllers
import {
  ChangePasswordController,
  ForgotPasswordController,
  ResetPasswordController,
} from './infrastructure/controllers';

const providers = [
  // Outbound Adapters (Infrastructure)
  { provide: PasswordRepositoryPort, useClass: PrismaPasswordRepository },
  { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
  { provide: PasswordResetTokenPort, useClass: PrismaPasswordResetTokenService },
  { provide: PasswordResetEmailPort, useClass: EmailPasswordResetSender },
  { provide: EventBusPort, useClass: NestEventBusAdapter },
  { provide: SessionInvalidationPort, useClass: SessionInvalidationAdapter },
  // Bridge: adapts EmailService to the EmailServicePort interface expected by adapters
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
    provide: ForgotPasswordPort,
    useFactory: (
      passwordRepository: PasswordRepositoryPort,
      tokenService: PasswordResetTokenPort,
      emailSender: PasswordResetEmailPort,
      eventBus: EventBusPort,
      logger: LoggerPort,
    ) => {
      return new ForgotPasswordUseCase(
        passwordRepository,
        tokenService,
        emailSender,
        eventBus,
        logger,
      );
    },
    inject: [
      PasswordRepositoryPort,
      PasswordResetTokenPort,
      PasswordResetEmailPort,
      EventBusPort,
      LoggerPort,
    ],
  },
  {
    provide: ResetPasswordPort,
    useFactory: (
      passwordRepository: PasswordRepositoryPort,
      tokenService: PasswordResetTokenPort,
      passwordHasher: PasswordHasherPort,
      sessionInvalidation: SessionInvalidationPort,
      eventBus: EventBusPort,
      logger: LoggerPort,
    ) => {
      return new ResetPasswordUseCase(
        passwordRepository,
        tokenService,
        passwordHasher,
        sessionInvalidation,
        eventBus,
        logger,
      );
    },
    inject: [
      PasswordRepositoryPort,
      PasswordResetTokenPort,
      PasswordHasherPort,
      SessionInvalidationPort,
      EventBusPort,
      LoggerPort,
    ],
  },
  {
    provide: ChangePasswordPort,
    useFactory: (
      passwordRepository: PasswordRepositoryPort,
      passwordHasher: PasswordHasherPort,
      sessionInvalidation: SessionInvalidationPort,
      eventBus: EventBusPort,
      logger: LoggerPort,
    ) => {
      return new ChangePasswordUseCase(
        passwordRepository,
        passwordHasher,
        sessionInvalidation,
        eventBus,
        logger,
      );
    },
    inject: [
      PasswordRepositoryPort,
      PasswordHasherPort,
      SessionInvalidationPort,
      EventBusPort,
      LoggerPort,
    ],
  },
];

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule, CacheModule],
  controllers: [ForgotPasswordController, ResetPasswordController, ChangePasswordController],
  providers,
  exports: [ForgotPasswordPort, ResetPasswordPort, ChangePasswordPort],
})
export class PasswordManagementModule {}
