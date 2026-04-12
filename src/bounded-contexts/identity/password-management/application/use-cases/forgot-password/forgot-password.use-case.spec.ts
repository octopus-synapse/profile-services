/**
 * Forgot Password Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { PasswordResetRequestedEvent } from '../../../domain/events';
import {
  DEFAULT_USER,
  InMemoryEmailSender,
  InMemoryPasswordRepository,
  InMemoryTokenService,
} from '../../../testing';
import { ForgotPasswordUseCase } from './forgot-password.use-case';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let passwordRepository: InMemoryPasswordRepository;
  let tokenService: InMemoryTokenService;
  let emailSender: InMemoryEmailSender;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    passwordRepository = new InMemoryPasswordRepository();
    tokenService = new InMemoryTokenService();
    emailSender = new InMemoryEmailSender();
    eventBus = new InMemoryEventBus();

    passwordRepository.seedUser(DEFAULT_USER);

    useCase = new ForgotPasswordUseCase(passwordRepository, tokenService, emailSender, eventBus);
  });

  // ───────────────────────────────────────────────────────────────
  // Happy Path
  // ───────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should create a token, send an email, and publish PasswordResetRequestedEvent for existing user', async () => {
      // Arrange
      const command = { email: DEFAULT_USER.email };

      // Act
      await useCase.execute(command);

      // Assert - token created
      const tokens = tokenService.getAllTokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].userId).toBe(DEFAULT_USER.id);

      // Assert - email sent
      expect(emailSender.getEmailCount()).toBe(1);
      expect(emailSender.wasEmailSentTo(DEFAULT_USER.email)).toBe(true);
      const lastEmail = emailSender.getLastSentEmail();
      expect(lastEmail).not.toBeNull();
      expect(lastEmail?.to).toBe(DEFAULT_USER.email);
      expect(lastEmail?.userName).toBe(DEFAULT_USER.name);
      expect(lastEmail?.resetToken).toBe(tokens[0].token);

      // Assert - event published
      expect(eventBus.hasPublished(PasswordResetRequestedEvent)).toBe(true);
      const event = eventBus.getEventsByType(PasswordResetRequestedEvent)[0];
      expect(event.userId).toBe(DEFAULT_USER.id);
      expect(event.email).toBe(DEFAULT_USER.email);
    });

    // ───────────────────────────────────────────────────────────────
    // Email Enumeration Prevention
    // ───────────────────────────────────────────────────────────────

    it('should silently return without side effects when user is not found (prevents email enumeration)', async () => {
      // Arrange
      const command = { email: 'nonexistent@example.com' };

      // Act
      await useCase.execute(command);

      // Assert - no token created
      expect(tokenService.getAllTokens()).toHaveLength(0);

      // Assert - no email sent
      expect(emailSender.getEmailCount()).toBe(0);

      // Assert - no event published
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });

    // ───────────────────────────────────────────────────────────────
    // Token Generation
    // ───────────────────────────────────────────────────────────────

    it('should generate a unique reset token value', async () => {
      // Arrange
      const command = { email: DEFAULT_USER.email };

      // Act
      await useCase.execute(command);

      // Assert
      const tokens = tokenService.getAllTokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].token).toBeTruthy();
      expect(tokens[0].token.length).toBeGreaterThan(0);
    });

    it('should pass the token value to both the token service and the email sender', async () => {
      // Arrange
      const command = { email: DEFAULT_USER.email };

      // Act
      await useCase.execute(command);

      // Assert
      const storedToken = tokenService.getAllTokens()[0].token;
      const emailedToken = emailSender.getLastSentEmail()?.resetToken ?? '';
      expect(storedToken).toBe(emailedToken);
    });
  });
});
