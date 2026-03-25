import { Inject, Injectable } from '@nestjs/common';
import { AccountDeactivatedException } from '../../../account-lifecycle/domain/exceptions';
import type { EventBusPort } from '../../../shared-kernel/ports';
import type { Validate2faPort } from '../../../two-factor-auth/ports/inbound';
import { LoginFailedEvent, UserLoggedInEvent } from '../../domain/events';
import { Invalid2faCodeException, InvalidCredentialsException } from '../../domain/exceptions';
import type {
  LoginCommand,
  LoginPort,
  LoginResult,
  LoginVerify2faCommand,
} from '../../ports/inbound';
import type {
  AuthenticationRepositoryPort,
  PasswordHasherPort,
  TokenGeneratorPort,
} from '../../ports/outbound';

const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const TOKEN_GENERATOR = Symbol('TokenGeneratorPort');
const EVENT_BUS = Symbol('EventBusPort');
const VALIDATE_2FA = Symbol('Validate2faPort');

// Refresh token expiration: 7 days
const REFRESH_TOKEN_DAYS = 7;

@Injectable()
export class LoginUseCase implements LoginPort {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthenticationRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_GENERATOR)
    private readonly tokenGenerator: TokenGeneratorPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
    @Inject(VALIDATE_2FA)
    private readonly validate2fa: Validate2faPort,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const { email, password, ipAddress, userAgent } = command;

    // Find user
    const user = await this.repository.findUserByEmail(email);

    if (!user || !user.passwordHash) {
      this.eventBus.publish(new LoginFailedEvent(email, 'invalid_credentials', ipAddress));
      throw new InvalidCredentialsException();
    }

    // Check if account is active
    if (!user.isActive) {
      this.eventBus.publish(new LoginFailedEvent(email, 'account_inactive', ipAddress));
      throw new AccountDeactivatedException();
    }

    // Verify password
    const isValid = await this.passwordHasher.compare(password, user.passwordHash);
    if (!isValid) {
      this.eventBus.publish(new LoginFailedEvent(email, 'invalid_credentials', ipAddress));
      throw new InvalidCredentialsException();
    }

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
    await this.repository.createRefreshToken(userId, tokenPair.refreshToken, refreshTokenExpiry);

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

export { AUTH_REPOSITORY, PASSWORD_HASHER, TOKEN_GENERATOR, EVENT_BUS, VALIDATE_2FA };
