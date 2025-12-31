import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { EmailSenderService } from './services/email-sender.service';
import { EmailTemplateService } from './services/email-template.service';

describe('EmailService', () => {
  let service: EmailService;
  let senderService: jest.Mocked<EmailSenderService>;
  let templateService: jest.Mocked<EmailTemplateService>;

  const mockSenderService = {
    sendEmail: jest.fn(),
  };

  const mockTemplateService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: EmailSenderService,
          useValue: mockSenderService,
        },
        {
          provide: EmailTemplateService,
          useValue: mockTemplateService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    senderService = module.get(EmailSenderService);
    templateService = module.get(EmailTemplateService);
  });

  describe('sendEmail', () => {
    it('should delegate to senderService', async () => {
      const options = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      mockSenderService.sendEmail.mockResolvedValue(undefined);

      await service.sendEmail(options);

      expect(senderService.sendEmail).toHaveBeenCalledWith(options);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should delegate to templateService', async () => {
      mockTemplateService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.sendVerificationEmail(
        'user@example.com',
        'John Doe',
        'token-123',
      );

      expect(templateService.sendVerificationEmail).toHaveBeenCalledWith(
        'user@example.com',
        'John Doe',
        'token-123',
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should delegate to templateService', async () => {
      mockTemplateService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.sendPasswordResetEmail(
        'user@example.com',
        'Jane Smith',
        'reset-token-456',
      );

      expect(templateService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Jane Smith',
        'reset-token-456',
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should delegate to templateService', async () => {
      mockTemplateService.sendWelcomeEmail.mockResolvedValue(undefined);

      await service.sendWelcomeEmail('user@example.com', 'Alex Johnson');

      expect(templateService.sendWelcomeEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Alex Johnson',
      );
    });
  });

  describe('sendPasswordChangedEmail', () => {
    it('should delegate to templateService', async () => {
      mockTemplateService.sendPasswordChangedEmail.mockResolvedValue(undefined);

      await service.sendPasswordChangedEmail('user@example.com', 'Sam Wilson');

      expect(templateService.sendPasswordChangedEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Sam Wilson',
      );
    });
  });
});
