import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import { TokenRefreshedEvent } from '../../../domain/events';
import { InvalidRefreshTokenException } from '../../../domain/exceptions';
import { AuthenticationRepositoryPort, TokenGeneratorPort } from '../../../domain/ports';
import type { RefreshTokenCommand, RefreshTokenPort, RefreshTokenResult } from '../../ports';

// Refresh token expiration: 7 days
const REFRESH_TOKEN_DAYS = 7;

export class RefreshTokenUseCase implements RefreshTokenPort {
  constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly tokenGenerator: TokenGeneratorPort,
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

    await this.repository.createRefreshToken(
      user.id,
      tokenPair.refreshToken,
      refreshTokenExpiry,
      tokenData.authMethod ?? undefined,
    );

    // Publish event
    this.eventBus.publish(new TokenRefreshedEvent(user.id));

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
    };
  }
}
