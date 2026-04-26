import { LoggerPort } from '@/shared-kernel';
import { AccountDeactivatedException } from '../../../../account-lifecycle/domain/exceptions';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import { Validate2faInboundPort } from '../../../../two-factor-auth/application/ports';
import { LoginFailedEvent, UserLoggedInEvent } from '../../../domain/events';
import {
  AccountLockedException,
  Invalid2faCodeException,
  InvalidCredentialsException,
} from '../../../domain/exceptions';
import {
  AuthenticationRepositoryPort,
  LoginAttemptsPort,
  PasswordHasherPort,
  TokenGeneratorPort,
} from '../../../domain/ports';
import type { LoginCommand, LoginPort, LoginResult, LoginVerify2faCommand } from '../../ports';

// Refresh token expiration: 7 days
const REFRESH_TOKEN_DAYS = 7;

export class LoginUseCase implements LoginPort {
  constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly eventBus: EventBusPort,
    private readonly validate2fa: Validate2faInboundPort,
    private readonly loginAttempts: LoginAttemptsPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const { email, password, ipAddress, userAgent } = command;

    // Short-circuit: is the email currently locked out?
    const lock = await this.loginAttempts.getLockStatus(email);
    if (lock.locked) {
      const remainingMinutes = Math.max(1, Math.ceil((lock.resetInSeconds ?? 60) / 60));
      this.eventBus.publish(new LoginFailedEvent(email, 'account_locked', ipAddress));
      throw new AccountLockedException(remainingMinutes);
    }

    // Find user
    const user = await this.repository.findUserByEmail(email);

    if (!user?.passwordHash) {
      await this.loginAttempts.record({
        userId: null,
        email,
        success: false,
        ipAddress,
        userAgent,
        failureCode: 'invalid_credentials',
      });
      this.eventBus.publish(new LoginFailedEvent(email, 'invalid_credentials', ipAddress));
      throw new InvalidCredentialsException();
    }

    // Check if account is active
    if (!user.isActive) {
      await this.loginAttempts.record({
        userId: user.id,
        email,
        success: false,
        ipAddress,
        userAgent,
        failureCode: 'account_inactive',
      });
      this.eventBus.publish(new LoginFailedEvent(email, 'account_inactive', ipAddress));
      throw new AccountDeactivatedException();
    }

    // Verify password
    const isValid = await this.passwordHasher.compare(password, user.passwordHash);
    if (!isValid) {
      await this.loginAttempts.record({
        userId: user.id,
        email,
        success: false,
        ipAddress,
        userAgent,
        failureCode: 'invalid_credentials',
      });
      this.eventBus.publish(new LoginFailedEvent(email, 'invalid_credentials', ipAddress));
      throw new InvalidCredentialsException();
    }

    // Password OK — clear failed attempt history and record success.
    await this.loginAttempts.clearFailedAttempts(email);
    await this.loginAttempts.record({
      userId: user.id,
      email,
      success: true,
      ipAddress,
      userAgent,
    });

    // Check if 2FA is enabled — halt before issuing tokens
    const has2fa = await this.validate2fa.isEnabled(user.id);
    if (has2fa) {
      return {
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        userId: user.id,
        twoFactorRequired: true,
      };
    }

    return this.issueTokens(user.id, user.email, 'password', ipAddress, userAgent);
  }

  async completeWithTwoFactor(command: LoginVerify2faCommand): Promise<LoginResult> {
    const { userId, code, ipAddress, userAgent } = command;

    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const result = await this.validate2fa.validate(userId, code);
    if (!result.valid) {
      this.eventBus.publish(new LoginFailedEvent(user.email, 'invalid_2fa', ipAddress));
      throw new Invalid2faCodeException();
    }

    const loginMethod = result.method === 'totp' ? '2fa_totp' : '2fa_backup_code';
    return this.issueTokens(user.id, user.email, loginMethod, ipAddress, userAgent);
  }

  private async issueTokens(
    userId: string,
    email: string,
    method: 'password' | '2fa_totp' | '2fa_backup_code',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const tokenPair = await this.tokenGenerator.generateTokenPair({ userId, email });

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);
    const authMethod =
      method === 'password' ? 'PASSWORD' : method === '2fa_totp' ? '2FA_TOTP' : '2FA_BACKUP_CODE';
    await this.repository.createRefreshToken(
      userId,
      tokenPair.refreshToken,
      refreshTokenExpiry,
      authMethod,
    );

    await this.repository.updateLastLogin(userId);

    this.eventBus.publish(new UserLoggedInEvent(userId, method, ipAddress, userAgent));

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      userId,
      email,
    };
  }
}
