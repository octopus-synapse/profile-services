/**
 * EmailService Tests (Facade/Adapter)
 *
 * NOTA (Uncle Bob): EmailService é um adapter para serviço externo.
 * Como é uma borda, testamos que as operações completam sem erro.
 * Testes detalhados de templates e envio estão nos serviços especializados.
 *
 * Interaction testing é aceitável em bordas, mas preferimos testar
 * o comportamento observável (promise resolve/reject).
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { EmailSenderService } from './services/email-sender.service';
import { EmailTemplateService } from './services/email-template.service';

describe('EmailService (Adapter)', () => {
  let service: EmailService;

  // Stubs que simulam sucesso das operações
  const stubSenderService = {
    sendEmail: mock().mockResolvedValue(undefined),
  };

  const stubTemplateService = {
    sendVerificationEmail: mock().mockResolvedValue(undefined),
    sendPasswordResetEmail: mock().mockResolvedValue(undefined),
    sendWelcomeEmail: mock().mockResolvedValue(undefined),
    sendPasswordChangedEmail: mock().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: EmailSenderService, useValue: stubSenderService },
        { provide: EmailTemplateService, useValue: stubTemplateService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendEmail', () => {
    it('should complete successfully when sending raw email', async () => {
      const options = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      // Testa que a operação completa sem erro (comportamento)
      await expect(service.sendEmail(options)).resolves.toBeUndefined();
    });

    it('should propagate error when sending fails', async () => {
      stubSenderService.sendEmail.mockRejectedValueOnce(
        new Error('SMTP error'),
      );

      const options = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Content</p>',
      };

      await expect(async () => await service.sendEmail(options)).toThrow('SMTP error');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should complete successfully when sending verification email', async () => {
      await expect(
        service.sendVerificationEmail(
          'user@example.com',
          'John Doe',
          'token-123',
        ),
      ).resolves.toBeUndefined();
    });

    it('should propagate error when sending fails', async () => {
      stubTemplateService.sendVerificationEmail.mockRejectedValueOnce(
        new Error('Template error'),
      );

      await expect(
        service.sendVerificationEmail('user@example.com', 'John', 'token'),
      ).rejects.toThrow('Template error');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should complete successfully when sending password reset email', async () => {
      await expect(
        service.sendPasswordResetEmail(
          'user@example.com',
          'Jane Smith',
          'reset-token',
        ),
      ).resolves.toBeUndefined();
    });

    it('should propagate error when sending fails', async () => {
      stubTemplateService.sendPasswordResetEmail.mockRejectedValueOnce(
        new Error('Send failed'),
      );

      await expect(
        service.sendPasswordResetEmail('user@example.com', 'Jane', 'token'),
      ).rejects.toThrow('Send failed');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should complete successfully when sending welcome email', async () => {
      await expect(
        service.sendWelcomeEmail('user@example.com', 'Alex Johnson'),
      ).resolves.toBeUndefined();
    });

    it('should propagate error when sending fails', async () => {
      stubTemplateService.sendWelcomeEmail.mockRejectedValueOnce(
        new Error('Welcome email failed'),
      );

      await expect(
        service.sendWelcomeEmail('user@example.com', 'Alex'),
      ).rejects.toThrow('Welcome email failed');
    });
  });

  describe('sendPasswordChangedEmail', () => {
    it('should complete successfully when sending password changed email', async () => {
      await expect(
        service.sendPasswordChangedEmail('user@example.com', 'Sam Wilson'),
      ).resolves.toBeUndefined();
    });

    it('should propagate error when sending fails', async () => {
      stubTemplateService.sendPasswordChangedEmail.mockRejectedValueOnce(
        new Error('Email failed'),
      );

      await expect(
        service.sendPasswordChangedEmail('user@example.com', 'Sam'),
      ).rejects.toThrow('Email failed');
    });
  });
});
