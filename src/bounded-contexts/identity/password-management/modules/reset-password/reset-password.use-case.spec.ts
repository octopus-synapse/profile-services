/**
 * Reset Password Use Case Tests
 *
 * Uses In-Memory repositories and Stubs for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  InMemoryPasswordRepository,
  StubEventBus,
  StubHashService,
  StubTokenService,
} from '../../../shared-kernel/testing';
import { PasswordChangedEvent } from '../../domain/events';
import { InvalidResetTokenException, WeakPasswordException } from '../../domain/exceptions';

/**
 * Simplified version of ResetPasswordUseCase for testing without NestJS DI
 */
class TestResetPasswordUseCase {
  constructor(
    private readonly passwordRepository: InMemoryPasswordRepository,
    private readonly tokenService: StubTokenService,
    private readonly passwordHasher: StubHashService,
    private readonly eventBus: StubEventBus,
  ) {}

  async execute(command: { token: string; newPassword: string }): Promise<{ success: boolean }> {
    const { token, newPassword } = command;

    // Validate password strength first
    if (!this.isStrongPassword(newPassword)) {
      throw new WeakPasswordException(['Password does not meet security requirements']);
    }

    // Validate token
    let userId: string;
    try {
      userId = await this.tokenService.validateToken(token);
    } catch {
      throw new InvalidResetTokenException();
    }

    // Hash and update password
    const hashedPassword = await this.passwordHasher.hash(newPassword);
    await this.passwordRepository.updatePassword(userId, hashedPassword);

    // Invalidate token
    await this.tokenService.invalidateToken(token);

    // Publish password changed event (changedVia='reset')
    const event = new PasswordChangedEvent(userId, 'reset');
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

describe('ResetPasswordUseCase', () => {
  let useCase: TestResetPasswordUseCase;
  let passwordRepository: InMemoryPasswordRepository;
  let tokenService: StubTokenService;
  let passwordHasher: StubHashService;
  let eventBus: StubEventBus;

  const validPassword = 'SecureP@ssw0rd123!';
  const validToken = 'valid-reset-token';
  const userId = 'user-123';

  beforeEach(() => {
    passwordRepository = new InMemoryPasswordRepository();
    tokenService = new StubTokenService();
    passwordHasher = new StubHashService();
    eventBus = new StubEventBus();

    // Seed user
    passwordRepository.seedUser({
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: 'old_hash',
    });

    // Seed token
    tokenService.setValidationResult(userId);

    useCase = new TestResetPasswordUseCase(
      passwordRepository,
      tokenService,
      passwordHasher,
      eventBus,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should reset password successfully', async () => {
      const result = await useCase.execute({
        token: validToken,
        newPassword: validPassword,
      });

      expect(result).toEqual({ success: true });

      // Verify password was updated
      const user = passwordRepository.getUser(userId);
      expect(user?.passwordHash).toContain('hashed_'); // StubHashService prefix

      // Verify event was published
      expect(eventBus.hasPublished(PasswordChangedEvent)).toBe(true);
    });

    it('should throw WeakPasswordException for weak password', async () => {
      await expect(
        useCase.execute({
          token: validToken,
          newPassword: 'weak',
        }),
      ).rejects.toThrow(WeakPasswordException);

      // Verify password was NOT updated
      const user = passwordRepository.getUser(userId);
      expect(user?.passwordHash).toBe('old_hash');
    });

    it('should throw InvalidResetTokenException for invalid token', async () => {
      tokenService.setShouldValidate(false);

      await expect(
        useCase.execute({
          token: 'invalid-token',
          newPassword: validPassword,
        }),
      ).rejects.toThrow(InvalidResetTokenException);

      // Verify password was NOT updated
      const user = passwordRepository.getUser(userId);
      expect(user?.passwordHash).toBe('old_hash');
    });

    it('should publish PasswordChangedEvent with reset changedVia', async () => {
      await useCase.execute({
        token: validToken,
        newPassword: validPassword,
      });

      const events = eventBus.getEventsByType(PasswordChangedEvent);
      expect(events.length).toBe(1);
      expect(events[0].userId).toBe(userId);
      expect(events[0].changedVia).toBe('reset');
    });
  });
});
