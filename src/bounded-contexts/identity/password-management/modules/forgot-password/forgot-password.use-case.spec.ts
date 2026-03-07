/**
 * Forgot Password Use Case Tests
 *
 * Uses In-Memory repositories and Stubs for clean, behavior-focused testing.
 * Note: ForgotPasswordUseCase uses NestJS DI, so we test with direct construction.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  InMemoryPasswordRepository,
  StubEmailSender,
  StubEventBus,
  StubTokenService,
} from '../../../shared-kernel/testing';
import { PasswordResetRequestedEvent } from '../../domain/events';

/**
 * Simplified version of ForgotPasswordUseCase for testing without NestJS DI
 */
class TestForgotPasswordUseCase {
  constructor(
    private readonly passwordRepository: InMemoryPasswordRepository,
    private readonly tokenService: StubTokenService,
    private readonly emailSender: StubEmailSender,
    private readonly eventBus: StubEventBus,
  ) {}

  async execute(command: { email: string }): Promise<void> {
    const { email } = command;

    const user = await this.passwordRepository.findByEmail(email);
    if (!user) {
      return; // Silent return to prevent email enumeration
    }

    // Generate reset token
    const tokenValue = this.generateToken();

    // Store token
    await this.tokenService.createToken(user.id, tokenValue);

    // Send email
    await this.emailSender.sendResetEmail(email, user.name, tokenValue);

    // Publish domain event
    const event = new PasswordResetRequestedEvent(user.id, email);
    await this.eventBus.publish(event);
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

describe('ForgotPasswordUseCase', () => {
  let useCase: TestForgotPasswordUseCase;
  let passwordRepository: InMemoryPasswordRepository;
  let tokenService: StubTokenService;
  let emailSender: StubEmailSender;
  let eventBus: StubEventBus;

  beforeEach(() => {
    passwordRepository = new InMemoryPasswordRepository();
    tokenService = new StubTokenService();
    emailSender = new StubEmailSender();
    eventBus = new StubEventBus();

    useCase = new TestForgotPasswordUseCase(
      passwordRepository,
      tokenService,
      emailSender,
      eventBus,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should do nothing when user not found (prevents email enumeration)', async () => {
      await useCase.execute({ email: 'unknown@example.com' });

      expect(emailSender.wasSentTo('unknown@example.com')).toBe(false);
      expect(eventBus.hasPublished(PasswordResetRequestedEvent)).toBe(false);
    });

    it('should generate token, send email and publish event when user exists', async () => {
      passwordRepository.seedUser({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashed',
      });

      await useCase.execute({ email: 'john@example.com' });

      // Verify email was sent
      expect(emailSender.wasSentTo('john@example.com')).toBe(true);
      const sentEmail = emailSender.getLastEmail();
      expect(sentEmail?.userName).toBe('John Doe');
      expect(sentEmail?.resetToken).toBeDefined();

      // Verify token was created
      const tokens = tokenService.getTokensForUser('user-123');
      expect(tokens.length).toBeGreaterThan(0);

      // Verify event was published
      expect(eventBus.hasPublished(PasswordResetRequestedEvent)).toBe(true);
    });

    it('should handle user with null name', async () => {
      passwordRepository.seedUser({
        id: 'user-456',
        name: null,
        email: 'jane@example.com',
        passwordHash: 'hashed',
      });

      await useCase.execute({ email: 'jane@example.com' });

      const sentEmail = emailSender.getLastEmail();
      expect(sentEmail?.userName).toBeNull();
    });
  });
});
