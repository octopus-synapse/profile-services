import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '../../../../shared-kernel/ports';
import { TokenRefreshedEvent } from '../../../domain/events';
import { InvalidRefreshTokenException } from '../../../domain/exceptions';
import type { AuthenticationRepositoryPort, TokenGeneratorPort } from '../../../domain/ports';
import type { RefreshTokenCommand, RefreshTokenPort, RefreshTokenResult } from '../../ports';

const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const TOKEN_GENERATOR = Symbol('TokenGeneratorPort');
const EVENT_BUS = Symbol('EventBusPort');

// Refresh token expiration: 7 days
const REFRESH_TOKEN_DAYS = 7;

@Injectable()
export class RefreshTokenUseCase implements RefreshTokenPort {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthenticationRepositoryPort,
    @Inject(TOKEN_GENERATOR)
    private readonly tokenGenerator: TokenGeneratorPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    const { refreshToken } = command;

    // Find refresh token
    const tokenData = await this.repository.findRefreshToken(refreshToken);
    if (!tokenData) {
      throw new InvalidRefreshTokenException();
    }

    // Check if expired
    if (new Date() > tokenData.expiresAt) {
      await this.repository.deleteRefreshToken(refreshToken);
      throw new InvalidRefreshTokenException();
    }

    // Get user
    const user = await this.repository.findUserById(tokenData.userId);
    if (!user?.isActive) {
      await this.repository.deleteRefreshToken(refreshToken);
      throw new InvalidRefreshTokenException();
    }

    // Delete old refresh token (rotation)
    await this.repository.deleteRefreshToken(refreshToken);

    // Generate new tokens
    const tokenPair = await this.tokenGenerator.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Store new refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

    await this.repository.createRefreshToken(user.id, tokenPair.refreshToken, refreshTokenExpiry);

    // Publish event
    this.eventBus.publish(new TokenRefreshedEvent(user.id));

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
    };
  }
}

export { AUTH_REPOSITORY, EVENT_BUS, TOKEN_GENERATOR };
