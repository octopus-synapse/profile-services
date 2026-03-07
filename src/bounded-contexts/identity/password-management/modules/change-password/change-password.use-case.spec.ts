/**
 * Change Password Use Case Tests
 *
 * Uses In-Memory repositories and Stubs for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '../../../shared-kernel/exceptions';
import {
  InMemoryPasswordRepository,
  StubEventBus,
  StubHashService,
} from '../../../shared-kernel/testing';
import { PasswordChangedEvent } from '../../domain/events';
import {
  InvalidCurrentPasswordException,
  SamePasswordException,
  WeakPasswordException,
} from '../../domain/exceptions';

/**
 * Simplified version of ChangePasswordUseCase for testing without NestJS DI
 */
class TestChangePasswordUseCase {
  constructor(
    private readonly passwordRepository: InMemoryPasswordRepository,
    private readonly passwordHasher: StubHashService,
    private readonly eventBus: StubEventBus,
  ) {}

  async execute(command: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    const { userId, currentPassword, newPassword } = command;

    // Validate new password strength first
    if (!this.isStrongPassword(newPassword)) {
      throw new WeakPasswordException(['Password does not meet security requirements']);
    }

    // Find user
    const user = await this.passwordRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    // Verify current password
    const isCurrentValid = await this.passwordHasher.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new InvalidCurrentPasswordException();
    }

    // Check if new password is same as current
    const isSamePassword = await this.passwordHasher.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new SamePasswordException();
    }

    // Hash and update password
    const hashedPassword = await this.passwordHasher.hash(newPassword);
    await this.passwordRepository.updatePassword(userId, hashedPassword);

    // Publish event
    const event = new PasswordChangedEvent(userId, 'profile');
    await this.eventBus.publish(event);

    return { success: true };
  }

  private isStrongPassword(password: string): boolean {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*]/.test(password)
    );
  }
}

describe('ChangePasswordUseCase', () => {
  let useCase: TestChangePasswordUseCase;
  let passwordRepository: InMemoryPasswordRepository;
  let passwordHasher: StubHashService;
  let eventBus: StubEventBus;

  const userId = 'user-123';
  const currentPassword = 'CurrentP@ssw0rd!';
  const newPassword = 'NewSecureP@ssw0rd123!';

  beforeEach(() => {
    passwordRepository = new InMemoryPasswordRepository();
    passwordHasher = new StubHashService();
    eventBus = new StubEventBus();

    // Seed user with hashed current password
    passwordRepository.seedUser({
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: `hashed_${currentPassword}`, // Matches StubHashService format
    });

    useCase = new TestChangePasswordUseCase(passwordRepository, passwordHasher, eventBus);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should change password successfully', async () => {
      const result = await useCase.execute({
        userId,
        currentPassword,
        newPassword,
      });

      expect(result).toEqual({ success: true });

      // Verify password was updated
      const user = passwordRepository.getUser(userId);
      expect(user?.passwordHash).toBe(`hashed_${newPassword}`);

      // Verify event was published
      expect(eventBus.hasPublished(PasswordChangedEvent)).toBe(true);
    });

    it('should throw WeakPasswordException for weak new password', async () => {
      await expect(
        useCase.execute({
          userId,
          currentPassword,
          newPassword: 'weak',
        }),
      ).rejects.toThrow(WeakPasswordException);

      // Password should not have changed
      const user = passwordRepository.getUser(userId);
      expect(user?.passwordHash).toBe(`hashed_${currentPassword}`);
    });

    it('should throw EntityNotFoundException when user not found', async () => {
      await expect(
        useCase.execute({
          userId: 'non-existent-user',
          currentPassword,
          newPassword,
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw InvalidCurrentPasswordException when current password is wrong', async () => {
      await expect(
        useCase.execute({
          userId,
          currentPassword: 'wrong-password',
          newPassword,
        }),
      ).rejects.toThrow(InvalidCurrentPasswordException);

      // Password should not have changed
      const user = passwordRepository.getUser(userId);
      expect(user?.passwordHash).toBe(`hashed_${currentPassword}`);
    });

    it('should throw SamePasswordException when new password equals current', async () => {
      await expect(
        useCase.execute({
          userId,
          currentPassword,
          newPassword: currentPassword, // Same as current
        }),
      ).rejects.toThrow(SamePasswordException);

      // Password should not have changed
      const user = passwordRepository.getUser(userId);
      expect(user?.passwordHash).toBe(`hashed_${currentPassword}`);
    });

    it('should publish PasswordChangedEvent with profile changedVia', async () => {
      await useCase.execute({
        userId,
        currentPassword,
        newPassword,
      });

      const events = eventBus.getEventsByType(PasswordChangedEvent);
      expect(events.length).toBe(1);
      expect(events[0].userId).toBe(userId);
      expect(events[0].changedVia).toBe('profile');
    });
  });
});
