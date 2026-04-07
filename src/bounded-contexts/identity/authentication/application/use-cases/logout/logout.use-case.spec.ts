/**
 * Logout Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { UserLoggedOutEvent } from '../../../domain/events';
import {
  InMemoryAuthenticationRepository,
  createAuthUser,
  createRefreshTokenData,
} from '../../../testing';
import { LogoutUseCase } from './logout.use-case';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let repository: InMemoryAuthenticationRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryAuthenticationRepository();
    eventBus = new InMemoryEventBus();

    useCase = new LogoutUseCase(repository, eventBus);
  });

  describe('execute', () => {
    it('should delete all refresh tokens and publish all_sessions event when logoutAllSessions is true', async () => {
      // Arrange
      const user = createAuthUser({ id: 'user-1' });
      repository.seedUser(user);

      const token1 = createRefreshTokenData({ userId: 'user-1', token: 'refresh-token-1' });
      const token2 = createRefreshTokenData({ userId: 'user-1', token: 'refresh-token-2' });
      const otherUserToken = createRefreshTokenData({ userId: 'user-2', token: 'refresh-token-3' });
      repository.seedRefreshToken(token1);
      repository.seedRefreshToken(token2);
      repository.seedRefreshToken(otherUserToken);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
        logoutAllSessions: true,
      });

      // Assert
      expect(result).toEqual({ success: true });

      const remainingTokens = repository.getAllRefreshTokens();
      expect(remainingTokens).toHaveLength(1);
      expect(remainingTokens[0].userId).toBe('user-2');

      expect(eventBus.hasPublished(UserLoggedOutEvent)).toBe(true);
      const events = eventBus.getEventsByType(UserLoggedOutEvent);
      expect(events).toHaveLength(1);
      expect(events[0].userId).toBe('user-1');
      expect(events[0].logoutType).toBe('all_sessions');
    });

    it('should delete only the specified refresh token and publish manual event', async () => {
      // Arrange
      const user = createAuthUser({ id: 'user-1' });
      repository.seedUser(user);

      const token1 = createRefreshTokenData({ userId: 'user-1', token: 'refresh-token-1' });
      const token2 = createRefreshTokenData({ userId: 'user-1', token: 'refresh-token-2' });
      repository.seedRefreshToken(token1);
      repository.seedRefreshToken(token2);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
        refreshToken: 'refresh-token-1',
      });

      // Assert
      expect(result).toEqual({ success: true });

      const remainingTokens = repository.getAllRefreshTokens();
      expect(remainingTokens).toHaveLength(1);
      expect(remainingTokens[0].token).toBe('refresh-token-2');

      expect(eventBus.hasPublished(UserLoggedOutEvent)).toBe(true);
      const events = eventBus.getEventsByType(UserLoggedOutEvent);
      expect(events).toHaveLength(1);
      expect(events[0].userId).toBe('user-1');
      expect(events[0].logoutType).toBe('manual');
    });

    it('should not delete any tokens or publish events when no refreshToken and no logoutAllSessions', async () => {
      // Arrange
      const token = createRefreshTokenData({ userId: 'user-1', token: 'refresh-token-1' });
      repository.seedRefreshToken(token);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
      });

      // Assert
      expect(result).toEqual({ success: true });

      const remainingTokens = repository.getAllRefreshTokens();
      expect(remainingTokens).toHaveLength(1);

      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });
  });
});
