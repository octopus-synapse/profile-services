/**
 * Reset Password Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { PasswordChangedEvent } from '../../../domain/events';
import { WeakPasswordException } from '../../../domain/exceptions';
import {
  InMemoryPasswordHasher,
  InMemoryPasswordRepository,
  InMemorySessionInvalidation,
  InMemoryTokenService,
  DEFAULT_USER,
} from '../../../testing';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let passwordRepository: InMemoryPasswordRepository;
  let tokenService: InMemoryTokenService;
  let passwordHasher: InMemoryPasswordHasher;
  let sessionInvalidation: InMemorySessionInvalidation;
  let eventBus: InMemoryEventBus;

  const validToken = 'valid-reset-token';
  const validNewPassword = 'NewSecure1';

  beforeEach(() => {
    passwordRepository = new InMemoryPasswordRepository();
    tokenService = new InMemoryTokenService();
    passwordHasher = new InMemoryPasswordHasher();
    sessionInvalidation = new InMemorySessionInvalidation();
    eventBus = new InMemoryEventBus();

    passwordRepository.seedUser(DEFAULT_USER);

    useCase = new ResetPasswordUseCase(
      passwordRepository,
      tokenService,
      passwordHasher,
      sessionInvalidation,
      eventBus,
    );
  });

  describe('execute', () => {
    // ───────────────────────────────────────────────────────────────
    // Happy Path
    // ───────────────────────────────────────────────────────────────

    it('should reset password, invalidate sessions, consume token, and publish PasswordChangedEvent', async () => {
      // Arrange
      await tokenService.createToken(DEFAULT_USER.id, validToken);

      // Act
      const result = await useCase.execute({ token: validToken, newPassword: validNewPassword });

      // Assert - success result
      expect(result.success).toBe(true);

      // Assert - password updated with hash
      const updatedUser = await passwordRepository.findById(DEFAULT_USER.id);
      expect(updatedUser!.passwordHash).toBe(`hashed:${validNewPassword}`);

      // Assert - token consumed (no longer valid)
      expect(tokenService.hasToken(validToken)).toBe(false);

      // Assert - sessions invalidated
      expect(sessionInvalidation.wasInvalidated(DEFAULT_USER.id)).toBe(true);

      // Assert - event published
      expect(eventBus.hasPublished(PasswordChangedEvent)).toBe(true);
      const event = eventBus.getEventsByType(PasswordChangedEvent)[0];
      expect(event.userId).toBe(DEFAULT_USER.id);
      expect(event.changedVia).toBe('reset');
    });

    // ───────────────────────────────────────────────────────────────
    // Invalid Token
    // ───────────────────────────────────────────────────────────────

    it('should throw when token is invalid', async () => {
      // Arrange - no token created

      // Act & Assert
      await expect(
        useCase.execute({ token: 'invalid-token', newPassword: validNewPassword }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw when token has already been consumed', async () => {
      // Arrange
      await tokenService.createToken(DEFAULT_USER.id, validToken);
      await useCase.execute({ token: validToken, newPassword: validNewPassword });

      // Act & Assert - second attempt with same token
      await expect(
        useCase.execute({ token: validToken, newPassword: validNewPassword }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    // ───────────────────────────────────────────────────────────────
    // Weak Password
    // ───────────────────────────────────────────────────────────────

    it('should throw WeakPasswordException when new password is too short', async () => {
      // Arrange
      await tokenService.createToken(DEFAULT_USER.id, validToken);

      // Act & Assert
      await expect(
        useCase.execute({ token: validToken, newPassword: 'Ab1' }),
      ).rejects.toThrow(WeakPasswordException);

      // Assert - token NOT consumed (validation happens before token consumption)
      expect(tokenService.hasToken(validToken)).toBe(true);
    });

    it('should throw WeakPasswordException when new password has no uppercase', async () => {
      // Arrange
      await tokenService.createToken(DEFAULT_USER.id, validToken);

      // Act & Assert
      await expect(
        useCase.execute({ token: validToken, newPassword: 'alllowercase1' }),
      ).rejects.toThrow(WeakPasswordException);
    });

    it('should throw WeakPasswordException when new password has no number', async () => {
      // Arrange
      await tokenService.createToken(DEFAULT_USER.id, validToken);

      // Act & Assert
      await expect(
        useCase.execute({ token: validToken, newPassword: 'NoNumberHere' }),
      ).rejects.toThrow(WeakPasswordException);
    });

    // ───────────────────────────────────────────────────────────────
    // Side Effects on Failure
    // ───────────────────────────────────────────────────────────────

    it('should not update password or invalidate sessions when token is invalid', async () => {
      // Arrange - no token

      // Act
      try {
        await useCase.execute({ token: 'bad-token', newPassword: validNewPassword });
      } catch {
        // expected
      }

      // Assert - password unchanged
      const user = await passwordRepository.findById(DEFAULT_USER.id);
      expect(user!.passwordHash).toBe(DEFAULT_USER.passwordHash);

      // Assert - no sessions invalidated
      expect(sessionInvalidation.getInvalidations()).toHaveLength(0);

      // Assert - no events published
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });
  });
});
