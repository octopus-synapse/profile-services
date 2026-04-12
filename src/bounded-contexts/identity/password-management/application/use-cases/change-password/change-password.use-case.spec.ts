/**
 * Change Password Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { PasswordChangedEvent } from '../../../domain/events';
import {
  InvalidCurrentPasswordException,
  SamePasswordException,
  WeakPasswordException,
} from '../../../domain/exceptions';
import {
  DEFAULT_USER,
  InMemoryPasswordHasher,
  InMemoryPasswordRepository,
  InMemorySessionInvalidation,
} from '../../../testing';
import { ChangePasswordUseCase } from './change-password.use-case';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let passwordRepository: InMemoryPasswordRepository;
  let passwordHasher: InMemoryPasswordHasher;
  let sessionInvalidation: InMemorySessionInvalidation;
  let eventBus: InMemoryEventBus;

  const currentPassword = 'password123';
  const validNewPassword = 'NewSecure1';

  beforeEach(async () => {
    passwordRepository = new InMemoryPasswordRepository();
    passwordHasher = new InMemoryPasswordHasher();
    sessionInvalidation = new InMemorySessionInvalidation();
    eventBus = new InMemoryEventBus();

    // Seed user with a properly hashed password so InMemoryPasswordHasher.compare works
    const hashedCurrent = await passwordHasher.hash(currentPassword);
    passwordRepository.seedUser({ ...DEFAULT_USER, passwordHash: hashedCurrent });

    useCase = new ChangePasswordUseCase(
      passwordRepository,
      passwordHasher,
      sessionInvalidation,
      eventBus,
    );
  });

  describe('execute', () => {
    // ───────────────────────────────────────────────────────────────
    // Happy Path
    // ───────────────────────────────────────────────────────────────

    it('should change password, invalidate sessions, and publish PasswordChangedEvent', async () => {
      // Arrange
      const command = {
        userId: DEFAULT_USER.id,
        currentPassword,
        newPassword: validNewPassword,
      };

      // Act
      const result = await useCase.execute(command);

      // Assert - success result
      expect(result.success).toBe(true);

      // Assert - password updated
      const updatedUser = await passwordRepository.findById(DEFAULT_USER.id);
      expect(updatedUser?.passwordHash).toBe(`hashed:${validNewPassword}`);

      // Assert - sessions invalidated
      expect(sessionInvalidation.wasInvalidated(DEFAULT_USER.id)).toBe(true);

      // Assert - event published
      expect(eventBus.hasPublished(PasswordChangedEvent)).toBe(true);
      const event = eventBus.getEventsByType(PasswordChangedEvent)[0];
      expect(event.userId).toBe(DEFAULT_USER.id);
      expect(event.changedVia).toBe('profile');
    });

    // ───────────────────────────────────────────────────────────────
    // User Not Found
    // ───────────────────────────────────────────────────────────────

    it('should throw EntityNotFoundException when user does not exist', async () => {
      // Arrange
      const command = {
        userId: 'nonexistent-user',
        currentPassword,
        newPassword: validNewPassword,
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(EntityNotFoundException);
    });

    // ───────────────────────────────────────────────────────────────
    // Invalid Current Password
    // ───────────────────────────────────────────────────────────────

    it('should throw InvalidCurrentPasswordException when current password is wrong', async () => {
      // Arrange
      const command = {
        userId: DEFAULT_USER.id,
        currentPassword: 'wrongPassword',
        newPassword: validNewPassword,
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(InvalidCurrentPasswordException);

      // Assert - password unchanged
      const user = await passwordRepository.findById(DEFAULT_USER.id);
      expect(user?.passwordHash).toBe(`hashed:${currentPassword}`);

      // Assert - no sessions invalidated
      expect(sessionInvalidation.getInvalidations()).toHaveLength(0);

      // Assert - no events published
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });

    // ───────────────────────────────────────────────────────────────
    // Same Password
    // ───────────────────────────────────────────────────────────────

    it('should throw SamePasswordException when new password equals current password', async () => {
      // Arrange - use a password that passes validation (has uppercase, lowercase, number)
      const strongPassword = 'StrongPass1';
      const hashedStrong = await passwordHasher.hash(strongPassword);
      passwordRepository.clear();
      passwordRepository.seedUser({ ...DEFAULT_USER, passwordHash: hashedStrong });

      const command = {
        userId: DEFAULT_USER.id,
        currentPassword: strongPassword,
        newPassword: strongPassword,
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(SamePasswordException);

      // Assert - password unchanged
      const user = await passwordRepository.findById(DEFAULT_USER.id);
      expect(user?.passwordHash).toBe(hashedStrong);

      // Assert - no sessions invalidated
      expect(sessionInvalidation.getInvalidations()).toHaveLength(0);
    });

    // ───────────────────────────────────────────────────────────────
    // Weak New Password
    // ───────────────────────────────────────────────────────────────

    it('should throw WeakPasswordException when new password is too short', async () => {
      // Arrange
      const command = {
        userId: DEFAULT_USER.id,
        currentPassword,
        newPassword: 'Ab1',
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(WeakPasswordException);
    });

    it('should throw WeakPasswordException when new password has no uppercase', async () => {
      // Arrange
      const command = {
        userId: DEFAULT_USER.id,
        currentPassword,
        newPassword: 'alllowercase1',
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(WeakPasswordException);
    });

    it('should throw WeakPasswordException when new password has no number', async () => {
      // Arrange
      const command = {
        userId: DEFAULT_USER.id,
        currentPassword,
        newPassword: 'NoNumberHere',
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(WeakPasswordException);
    });

    // ───────────────────────────────────────────────────────────────
    // Side Effects on Failure
    // ───────────────────────────────────────────────────────────────

    it('should not change password or publish events when current password is invalid', async () => {
      // Arrange
      const command = {
        userId: DEFAULT_USER.id,
        currentPassword: 'wrongPassword',
        newPassword: validNewPassword,
      };

      // Act
      try {
        await useCase.execute(command);
      } catch {
        // expected
      }

      // Assert - password unchanged
      const user = await passwordRepository.findById(DEFAULT_USER.id);
      expect(user?.passwordHash).toBe(`hashed:${currentPassword}`);

      // Assert - no sessions invalidated
      expect(sessionInvalidation.getInvalidations()).toHaveLength(0);

      // Assert - no events published
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });
  });
});
