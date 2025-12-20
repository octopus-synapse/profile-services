import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { EmailService } from './email.service';
import { AppLoggerService } from '../logger/logger.service';

jest.mock('@sendgrid/mail');

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let logger: AppLoggerService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AppLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<AppLoggerService>(AppLoggerService);
  });

  describe('initialization', () => {
    it('should configure SendGrid when API key is provided', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENDGRID_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'test@example.com';
          case 'EMAIL_FROM_NAME':
            return 'Test App';
          default:
            return undefined;
        }
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);

      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'SendGrid configured successfully',
        'EmailService',
      );
    });

    it('should warn when API key is not provided', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return undefined;
        if (key === 'EMAIL_FROM') return 'test@example.com';
        if (key === 'EMAIL_FROM_NAME') return 'Test App';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SendGrid API key not found. Email sending will be disabled.',
        'EmailService',
      );
    });

    it('should use default values when EMAIL_FROM and EMAIL_FROM_NAME are not provided', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return 'test-api-key';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);

      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
    });
  });

  describe('sendEmail', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENDGRID_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'noreply@test.com';
          case 'EMAIL_FROM_NAME':
            return 'Test App';
          default:
            return undefined;
        }
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should send email successfully', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(mockSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: {
          email: 'noreply@test.com',
          name: 'Test App',
        },
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Email sent successfully',
        'EmailService',
        {
          to: 'user@example.com',
          subject: 'Test Subject',
        },
      );
    });

    it('should use provided text when available', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Custom plain text',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Custom plain text',
        }),
      );
    });

    it('should strip HTML for plain text when text is not provided', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<h1>Title</h1><p>Paragraph content</p><script>alert("xss")</script>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.not.stringContaining('<'),
        }),
      );
    });

    it('should handle email sending errors', async () => {
      const mockError = new Error('SendGrid API error');
      const mockSend = jest.fn().mockRejectedValue(mockError);
      (sgMail.send as jest.Mock) = mockSend;

      await expect(
        service.sendEmail({
          to: 'user@example.com',
          subject: 'Test Subject',
          html: '<p>Test content</p>',
        }),
      ).rejects.toThrow('SendGrid API error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send email',
        mockError.stack,
        'EmailService',
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
          error: 'SendGrid API error',
        }),
      );
    });

    it('should skip sending when service is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return undefined;
        if (key === 'EMAIL_FROM') return 'test@example.com';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<EmailService>(EmailService);
      const mockSend = jest.fn();
      (sgMail.send as jest.Mock) = mockSend;

      await unconfiguredService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(mockSend).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Email service not configured. Skipping email send.',
        'EmailService',
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
        }),
      );
    });
  });

  describe('sendVerificationEmail', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENDGRID_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'noreply@test.com';
          case 'EMAIL_FROM_NAME':
            return 'Test App';
          case 'FRONTEND_URL':
            return 'https://app.example.com';
          default:
            return undefined;
        }
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should send verification email with correct URL', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await service.sendVerificationEmail(
        'user@example.com',
        'John Doe',
        'verification-token-123',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Verifique seu email - ProFile',
          html: expect.stringContaining(
            'https://app.example.com/auth/verify-email?token=verification-token-123',
          ),
        }),
      );
    });

    it('should use default frontend URL when not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENDGRID_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'noreply@test.com';
          case 'FRONTEND_URL':
            return undefined;
          default:
            return undefined;
        }
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const serviceWithDefaults = module.get<EmailService>(EmailService);
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await serviceWithDefaults.sendVerificationEmail(
        'user@example.com',
        'John Doe',
        'token-123',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            'http://localhost:3000/auth/verify-email?token=token-123',
          ),
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENDGRID_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'noreply@test.com';
          case 'EMAIL_FROM_NAME':
            return 'Test App';
          case 'FRONTEND_URL':
            return 'https://app.example.com';
          default:
            return undefined;
        }
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should send password reset email with correct URL', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await service.sendPasswordResetEmail(
        'user@example.com',
        'Jane Smith',
        'reset-token-456',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Redefinir senha - ProFile',
          html: expect.stringContaining(
            'https://app.example.com/auth/reset-password?token=reset-token-456',
          ),
        }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENDGRID_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'noreply@test.com';
          default:
            return undefined;
        }
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should send welcome email', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await service.sendWelcomeEmail('user@example.com', 'Alex Johnson');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Bem-vindo ao ProFile! 🎉',
          html: expect.stringContaining('Alex Johnson'),
        }),
      );
    });
  });

  describe('sendPasswordChangedEmail', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENDGRID_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'noreply@test.com';
          default:
            return undefined;
        }
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: AppLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should send password changed notification email', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await service.sendPasswordChangedEmail('user@example.com', 'Sam Wilson');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Sua senha foi alterada - ProFile',
          html: expect.stringContaining('Sam Wilson'),
        }),
      );
    });
  });
});
