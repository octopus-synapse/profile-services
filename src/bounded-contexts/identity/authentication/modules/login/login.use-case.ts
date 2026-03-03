import { Inject, Injectable } from '@nestjs/common';
import { AccountDeactivatedException } from '../../../account-lifecycle/domain/exceptions';
import type { EventBusPort } from '../../../shared-kernel/ports';
import { LoginFailedEvent, UserLoggedInEvent } from '../../domain/events';
import { InvalidCredentialsException } from '../../domain/exceptions';
import type { LoginCommand, LoginPort, LoginResult } from '../../ports/inbound';
import type {
  AuthenticationRepositoryPort,
  PasswordHasherPort,
  TokenGeneratorPort,
} from '../../ports/outbound';

const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const TOKEN_GENERATOR = Symbol('TokenGeneratorPort');
const EVENT_BUS = Symbol('EventBusPort');

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

    // Generate tokens
    const tokenPair = await this.tokenGenerator.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

    await this.repository.createRefreshToken(user.id, tokenPair.refreshToken, refreshTokenExpiry);

    // Update last login
    await this.repository.updateLastLogin(user.id);

    // Publish success event
    this.eventBus.publish(new UserLoggedInEvent(user.id, 'password', ipAddress, userAgent));

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      userId: user.id,
    };
  }
}

export { AUTH_REPOSITORY, PASSWORD_HASHER, TOKEN_GENERATOR, EVENT_BUS };
