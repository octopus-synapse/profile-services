/**
 * SendVerificationEmail Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { VerificationEmailSentEvent } from '../../../domain/events';
import {
  EmailAlreadyVerifiedException,
  VerificationTokenAlreadySentException,
} from '../../../domain/exceptions';
import {
  DEFAULT_USER,
  DEFAULT_VERIFIED_USER,
  InMemoryEmailVerificationRepository,
  InMemoryVerificationEmailSender,
} from '../../../testing';
import { SendVerificationEmailUseCase } from './send-verification-email.use-case';

describe('SendVerificationEmailUseCase', () => {
  let repository: InMemoryEmailVerificationRepository;
  let emailSender: InMemoryVerificationEmailSender;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryEmailVerificationRepository();
    emailSender = new InMemoryVerificationEmailSender();
    eventBus = new InMemoryEventBus();

    repository.seedUser(DEFAULT_USER.id, DEFAULT_USER.email, DEFAULT_USER.emailVerified);
  });

  function buildUseCase(
    env: { NODE_ENV: 'development' | 'test' | 'staging' | 'production'; BYPASS_2FA?: boolean } = {
      NODE_ENV: 'test',
      BYPASS_2FA: false,
    },
  ): SendVerificationEmailUseCase {
    return new SendVerificationEmailUseCase(repository, emailSender, eventBus, stubLogger, env);
  }

  // ───────────────────────────────────────────────────────────────
  // Success scenarios
  // ───────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should send verification email, create token, and publish VerificationEmailSentEvent', async () => {
      const useCase = buildUseCase();
      await useCase.execute({ userId: DEFAULT_USER.id });

      // Token was created
      const tokens = repository.getAllTokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].userId).toBe(DEFAULT_USER.id);
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Email was sent
      const sentEmail = emailSender.getLastSentEmail();
      expect(sentEmail).not.toBeNull();
      expect(sentEmail?.email).toBe(DEFAULT_USER.email);
      expect(sentEmail?.userName).toBeNull();
      expect(sentEmail?.verificationToken).toBe(tokens[0].token);

      // Domain event was published
      expect(eventBus.hasPublished(VerificationEmailSentEvent)).toBe(true);
      const event = eventBus.getEventsByType(VerificationEmailSentEvent)[0];
      expect(event.userId).toBe(DEFAULT_USER.id);
      expect(event.email).toBe(DEFAULT_USER.email);
    });

    it('should delete existing tokens before creating a new one', async () => {
      const useCase = buildUseCase();
      // Seed an old token (created long ago, outside rate limit)
      const oldCreatedAt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      repository.seedToken(
        DEFAULT_USER.id,
        'old-token',
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        DEFAULT_USER.email,
        oldCreatedAt,
      );

      await useCase.execute({ userId: DEFAULT_USER.id });

      // Old token should be deleted, only new token remains
      const tokens = repository.getAllTokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].token).not.toBe('old-token');
    });

    // ───────────────────────────────────────────────────────────────
    // Error scenarios
    // ───────────────────────────────────────────────────────────────

    it('should throw EntityNotFoundException when user does not exist', async () => {
      const useCase = buildUseCase();
      expect(useCase.execute({ userId: 'nonexistent-user' })).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw EmailAlreadyVerifiedException when email is already verified', async () => {
      const useCase = buildUseCase();
      repository.seedUser(
        DEFAULT_VERIFIED_USER.id,
        DEFAULT_VERIFIED_USER.email,
        DEFAULT_VERIFIED_USER.emailVerified,
      );

      expect(useCase.execute({ userId: DEFAULT_VERIFIED_USER.id })).rejects.toThrow(
        EmailAlreadyVerifiedException,
      );
    });

    it('should throw VerificationTokenAlreadySentException when a recent token exists (rate limit)', async () => {
      const useCase = buildUseCase();
      // Seed a token created just now (within the 5-minute rate limit)
      repository.seedToken(
        DEFAULT_USER.id,
        'recent-token',
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        DEFAULT_USER.email,
        new Date(), // created now
      );

      expect(useCase.execute({ userId: DEFAULT_USER.id })).rejects.toThrow(
        VerificationTokenAlreadySentException,
      );
    });

    it('should not send email or publish event when user is not found', async () => {
      const useCase = buildUseCase();
      try {
        await useCase.execute({ userId: 'nonexistent-user' });
      } catch {
        // expected
      }

      expect(emailSender.getSentEmails()).toHaveLength(0);
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });

    it('should not send email or publish event when email is already verified', async () => {
      const useCase = buildUseCase();
      repository.seedUser(
        DEFAULT_VERIFIED_USER.id,
        DEFAULT_VERIFIED_USER.email,
        DEFAULT_VERIFIED_USER.emailVerified,
      );

      try {
        await useCase.execute({ userId: DEFAULT_VERIFIED_USER.id });
      } catch {
        // expected
      }

      expect(emailSender.getSentEmails()).toHaveLength(0);
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });

    it('should not create token or send email when rate limited', async () => {
      const useCase = buildUseCase();
      repository.seedToken(
        DEFAULT_USER.id,
        'recent-token',
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        DEFAULT_USER.email,
        new Date(),
      );

      try {
        await useCase.execute({ userId: DEFAULT_USER.id });
      } catch {
        // expected
      }

      // Only the seeded token should exist, no new one created
      const tokens = repository.getAllTokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].token).toBe('recent-token');

      expect(emailSender.getSentEmails()).toHaveLength(0);
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });

    it('should include testCode when BYPASS_2FA is true outside production', async () => {
      const useCase = buildUseCase({ NODE_ENV: 'test', BYPASS_2FA: true });
      const result = await useCase.execute({ userId: DEFAULT_USER.id });
      expect(result.testCode).toBeDefined();
      expect(result.testCode?.length).toBe(6);
    });

    it('should not include testCode when BYPASS_2FA is false', async () => {
      const useCase = buildUseCase({ NODE_ENV: 'test', BYPASS_2FA: false });
      const result = await useCase.execute({ userId: DEFAULT_USER.id });
      expect(result.testCode).toBeUndefined();
    });

    it('should not include testCode in production even when BYPASS_2FA is true', async () => {
      const useCase = buildUseCase({ NODE_ENV: 'production', BYPASS_2FA: true });
      const result = await useCase.execute({ userId: DEFAULT_USER.id });
      expect(result.testCode).toBeUndefined();
    });
  });
});
