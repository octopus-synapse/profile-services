import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import {
  AuthCoreService,
  TokenRefreshService,
  EmailVerificationService,
  PasswordResetService,
  AccountManagementService,
} from './services';

describe('AuthService', () => {
  let service: AuthService;
  let authCoreService: jest.Mocked<AuthCoreService>;
  let tokenRefreshService: jest.Mocked<TokenRefreshService>;
  let emailVerificationService: jest.Mocked<EmailVerificationService>;
  let passwordResetService: jest.Mocked<PasswordResetService>;
  let accountManagementService: jest.Mocked<AccountManagementService>;

  const mockAuthCoreService = {
    signup: jest.fn(),
    validateUser: jest.fn(),
    login: jest.fn(),
  };

  const mockTokenRefreshService = {
    refreshToken: jest.fn(),
  };

  const mockEmailVerificationService = {
    requestVerification: jest.fn(),
    verifyEmail: jest.fn(),
  };

  const mockPasswordResetService = {
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockAccountManagementService = {
    changeEmail: jest.fn(),
    deleteAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthCoreService,
          useValue: mockAuthCoreService,
        },
        {
          provide: TokenRefreshService,
          useValue: mockTokenRefreshService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: PasswordResetService,
          useValue: mockPasswordResetService,
        },
        {
          provide: AccountManagementService,
          useValue: mockAccountManagementService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authCoreService = module.get(AuthCoreService);
    tokenRefreshService = module.get(TokenRefreshService);
    emailVerificationService = module.get(EmailVerificationService);
    passwordResetService = module.get(PasswordResetService);
    accountManagementService = module.get(AccountManagementService);
  });

  describe('signup', () => {
    const signupDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should delegate to authCoreService', async () => {
      const mockResult = {
        success: true,
        token: 'mock-jwt-token',
        user: { id: 'user-123', email: signupDto.email },
      };
      mockAuthCoreService.signup.mockResolvedValue(mockResult);

      const result = await service.signup(signupDto);

      expect(result).toEqual(mockResult);
      expect(authCoreService.signup).toHaveBeenCalledWith(signupDto);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should delegate to authCoreService', async () => {
      const mockResult = {
        success: true,
        token: 'mock-jwt-token',
        user: { id: 'user-123', email: loginDto.email },
      };
      mockAuthCoreService.login.mockResolvedValue(mockResult);

      const result = await service.login(loginDto);

      expect(result).toEqual(mockResult);
      expect(authCoreService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refreshToken', () => {
    it('should delegate to tokenRefreshService', async () => {
      const mockResult = {
        success: true,
        token: 'new-mock-jwt-token',
      };
      mockTokenRefreshService.refreshToken.mockResolvedValue(mockResult);

      const result = await service.refreshToken('user-123');

      expect(result).toEqual(mockResult);
      expect(tokenRefreshService.refreshToken).toHaveBeenCalledWith('user-123');
    });
  });

  describe('email verification', () => {
    it('should delegate requestEmailVerification to EmailVerificationService', async () => {
      const dto = { email: 'test@example.com' };
      mockEmailVerificationService.requestVerification.mockResolvedValue({
        success: true,
      });

      await service.requestEmailVerification(dto);

      expect(emailVerificationService.requestVerification).toHaveBeenCalledWith(
        dto,
      );
    });

    it('should delegate verifyEmail to EmailVerificationService', async () => {
      const dto = { token: 'verification-token' };
      mockEmailVerificationService.verifyEmail.mockResolvedValue({
        success: true,
      });

      await service.verifyEmail(dto);

      expect(emailVerificationService.verifyEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('password reset', () => {
    it('should delegate forgotPassword to PasswordResetService', async () => {
      const dto = { email: 'test@example.com' };
      mockPasswordResetService.forgotPassword.mockResolvedValue({
        success: true,
      });

      await service.forgotPassword(dto);

      expect(passwordResetService.forgotPassword).toHaveBeenCalledWith(dto);
    });

    it('should delegate resetPassword to PasswordResetService', async () => {
      const dto = { token: 'reset-token', password: 'newpass123' };
      mockPasswordResetService.resetPassword.mockResolvedValue({
        success: true,
      });

      await service.resetPassword(dto);

      expect(passwordResetService.resetPassword).toHaveBeenCalledWith(dto);
    });

    it('should delegate changePassword to PasswordResetService', async () => {
      const dto = {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      };
      mockPasswordResetService.changePassword.mockResolvedValue({
        success: true,
      });

      await service.changePassword('user-123', dto);

      expect(passwordResetService.changePassword).toHaveBeenCalledWith(
        'user-123',
        dto,
      );
    });
  });

  describe('account management', () => {
    it('should delegate changeEmail to AccountManagementService', async () => {
      const dto = { newEmail: 'new@example.com', currentPassword: 'password' };
      mockAccountManagementService.changeEmail.mockResolvedValue({
        success: true,
      });

      await service.changeEmail('user-123', dto);

      expect(accountManagementService.changeEmail).toHaveBeenCalledWith(
        'user-123',
        dto,
      );
    });

    it('should delegate deleteAccount to AccountManagementService', async () => {
      const dto = { password: 'password123' };
      mockAccountManagementService.deleteAccount.mockResolvedValue({
        success: true,
      });

      await service.deleteAccount('user-123', dto);

      expect(accountManagementService.deleteAccount).toHaveBeenCalledWith(
        'user-123',
        dto,
      );
    });
  });
});
