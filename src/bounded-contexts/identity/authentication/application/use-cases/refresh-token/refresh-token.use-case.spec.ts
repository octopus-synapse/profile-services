/**
 * Refresh Token Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { TokenRefreshedEvent } from '../../../domain/events';
import { InvalidRefreshTokenException } from '../../../domain/exceptions';
import {
  InMemoryAuthenticationRepository,
  InMemoryTokenGenerator,
  createAuthUser,
  createRefreshTokenData,
} from '../../../testing';
import { RefreshTokenUseCase } from './refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let repository: InMemoryAuthenticationRepository;
  let tokenGenerator: InMemoryTokenGenerator;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryAuthenticationRepository();
    tokenGenerator = new InMemoryTokenGenerator();
    eventBus = new InMemoryEventBus();

    useCase = new RefreshTokenUseCase(repository, tokenGenerator, eventBus);
  });

  describe('execute', () => {
    it('should rotate tokens and publish event for a valid refresh token', async () => {
      // Arrange
      const user = createAuthUser({ id: 'user-1', email: 'test@example.com', isActive: true });
      repository.seedUser(user);

      const refreshToken = createRefreshTokenData({
        userId: 'user-1',
        token: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      repository.seedRefreshToken(refreshToken);

      // Act
      const result = await useCase.execute({ refreshToken: 'old-refresh-token' });

      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);

      // Old token should be deleted
      const allTokens = repository.getAllRefreshTokens();
      expect(allTokens.every((t) => t.token !== 'old-refresh-token')).toBe(true);

      // New refresh token should be stored
      expect(allTokens).toHaveLength(1);
      expect(allTokens[0].token).toBe(result.refreshToken);
      expect(allTokens[0].userId).toBe('user-1');

      // Event should be published
      expect(eventBus.hasPublished(TokenRefreshedEvent)).toBe(true);
      const events = eventBus.getEventsByType(TokenRefreshedEvent);
      expect(events).toHaveLength(1);
      expect(events[0].userId).toBe('user-1');
    });

    it('should throw InvalidRefreshTokenException when token is not found', async () => {
      // Arrange — no tokens seeded

      // Act & Assert
      expect(useCase.execute({ refreshToken: 'nonexistent-token' })).rejects.toThrow(
        InvalidRefreshTokenException,
      );
    });

    it('should delete expired token and throw InvalidRefreshTokenException', async () => {
      // Arrange
      const user = createAuthUser({ id: 'user-1', isActive: true });
      repository.seedUser(user);

      const expiredToken = createRefreshTokenData({
        userId: 'user-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      });
      repository.seedRefreshToken(expiredToken);

      // Act & Assert
      await expect(useCase.execute({ refreshToken: 'expired-token' })).rejects.toThrow(
        InvalidRefreshTokenException,
      );

      // Expired token should be deleted
      const remainingTokens = repository.getAllRefreshTokens();
      expect(remainingTokens).toHaveLength(0);

      // No event should be published
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });

    it('should delete token and throw InvalidRefreshTokenException when user is inactive', async () => {
      // Arrange
      const inactiveUser = createAuthUser({ id: 'user-1', isActive: false });
      repository.seedUser(inactiveUser);

      const token = createRefreshTokenData({
        userId: 'user-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      repository.seedRefreshToken(token);

      // Act & Assert
      await expect(useCase.execute({ refreshToken: 'valid-token' })).rejects.toThrow(
        InvalidRefreshTokenException,
      );

      // Token should be deleted
      const remainingTokens = repository.getAllRefreshTokens();
      expect(remainingTokens).toHaveLength(0);

      // No event should be published
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });

    it('should delete token and throw InvalidRefreshTokenException when user is not found', async () => {
      // Arrange — no user seeded, but token exists
      const token = createRefreshTokenData({
        userId: 'nonexistent-user',
        token: 'orphaned-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      repository.seedRefreshToken(token);

      // Act & Assert
      await expect(useCase.execute({ refreshToken: 'orphaned-token' })).rejects.toThrow(
        InvalidRefreshTokenException,
      );

      // Token should be deleted
      const remainingTokens = repository.getAllRefreshTokens();
      expect(remainingTokens).toHaveLength(0);

      // No event should be published
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });
  });
});
