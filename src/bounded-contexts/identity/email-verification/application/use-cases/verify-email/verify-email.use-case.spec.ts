/**
 * VerifyEmail Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { EmailVerifiedEvent } from '../../../domain/events';
import {
  EmailAlreadyVerifiedException,
  InvalidVerificationTokenException,
} from '../../../domain/exceptions';
import {
  DEFAULT_EXPIRED_TOKEN,
  DEFAULT_TOKEN,
  DEFAULT_USER,
  DEFAULT_VERIFIED_USER,
  InMemoryEmailVerificationRepository,
} from '../../../testing';
import { VerifyEmailUseCase } from './verify-email.use-case';

describe('VerifyEmailUseCase', () => {
  let useCase: VerifyEmailUseCase;
  let repository: InMemoryEmailVerificationRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryEmailVerificationRepository();
    eventBus = new InMemoryEventBus();

    repository.seedUser(DEFAULT_USER.id, DEFAULT_USER.email, DEFAULT_USER.emailVerified);
    repository.seedToken(
      DEFAULT_TOKEN.userId,
      DEFAULT_TOKEN.token,
      DEFAULT_TOKEN.expiresAt,
      DEFAULT_USER.email,
    );

    useCase = new VerifyEmailUseCase(repository, eventBus);
  });

  // ───────────────────────────────────────────────────────────────
  // Success scenarios
  // ───────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should verify email, delete token, and publish EmailVerifiedEvent', async () => {
      const result = await useCase.execute({ token: DEFAULT_TOKEN.token });

      // Returns success with email
      expect(result.success).toBe(true);
      expect(result.email).toBe(DEFAULT_USER.email);

      // User is now verified
      const users = repository.getAllUsers();
      const user = users.find((u) => u.id === DEFAULT_USER.id);
      expect(user!.emailVerified).toBe(true);

      // Token was deleted
      const tokens = repository.getAllTokens();
      expect(tokens).toHaveLength(0);

      // Domain event was published
      expect(eventBus.hasPublished(EmailVerifiedEvent)).toBe(true);
      const event = eventBus.getEventsByType(EmailVerifiedEvent)[0];
      expect(event.userId).toBe(DEFAULT_USER.id);
      expect(event.email).toBe(DEFAULT_USER.email);
    });

    // ───────────────────────────────────────────────────────────────
    // Error scenarios
    // ───────────────────────────────────────────────────────────────

    it('should throw InvalidVerificationTokenException when token does not exist', async () => {
      expect(useCase.execute({ token: 'nonexistent-token' })).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });

    it('should throw InvalidVerificationTokenException and delete token when token is expired', async () => {
      repository.seedToken(
        DEFAULT_EXPIRED_TOKEN.userId,
        DEFAULT_EXPIRED_TOKEN.token,
        DEFAULT_EXPIRED_TOKEN.expiresAt,
        DEFAULT_USER.email,
      );

      expect(useCase.execute({ token: DEFAULT_EXPIRED_TOKEN.token })).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });

    it('should delete expired token from repository', async () => {
      repository.seedToken(
        DEFAULT_EXPIRED_TOKEN.userId,
        DEFAULT_EXPIRED_TOKEN.token,
        DEFAULT_EXPIRED_TOKEN.expiresAt,
        DEFAULT_USER.email,
      );

      try {
        await useCase.execute({ token: DEFAULT_EXPIRED_TOKEN.token });
      } catch {
        // expected
      }

      // Expired token should be deleted, valid token still present
      const tokens = repository.getAllTokens();
      const expiredToken = tokens.find((t) => t.token === DEFAULT_EXPIRED_TOKEN.token);
      expect(expiredToken).toBeUndefined();
    });

    it('should throw EntityNotFoundException when user associated with token does not exist', async () => {
      // Seed a token for a non-existent user
      repository.seedToken(
        'nonexistent-user',
        'orphan-token',
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        'orphan@example.com',
      );

      expect(useCase.execute({ token: 'orphan-token' })).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw EmailAlreadyVerifiedException and delete token when email is already verified', async () => {
      repository.seedUser(
        DEFAULT_VERIFIED_USER.id,
        DEFAULT_VERIFIED_USER.email,
        DEFAULT_VERIFIED_USER.emailVerified,
      );
      repository.seedToken(
        DEFAULT_VERIFIED_USER.id,
        'verified-user-token',
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        DEFAULT_VERIFIED_USER.email,
      );

      expect(useCase.execute({ token: 'verified-user-token' })).rejects.toThrow(
        EmailAlreadyVerifiedException,
      );
    });

    it('should delete token when email is already verified', async () => {
      repository.seedUser(
        DEFAULT_VERIFIED_USER.id,
        DEFAULT_VERIFIED_USER.email,
        DEFAULT_VERIFIED_USER.emailVerified,
      );
      repository.seedToken(
        DEFAULT_VERIFIED_USER.id,
        'verified-user-token',
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        DEFAULT_VERIFIED_USER.email,
      );

      try {
        await useCase.execute({ token: 'verified-user-token' });
      } catch {
        // expected
      }

      const tokens = repository.getAllTokens();
      const deletedToken = tokens.find((t) => t.token === 'verified-user-token');
      expect(deletedToken).toBeUndefined();
    });

    it('should not publish event when token is invalid', async () => {
      try {
        await useCase.execute({ token: 'nonexistent-token' });
      } catch {
        // expected
      }

      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });

    it('should not mark email as verified when token is expired', async () => {
      repository.seedToken(
        DEFAULT_EXPIRED_TOKEN.userId,
        DEFAULT_EXPIRED_TOKEN.token,
        DEFAULT_EXPIRED_TOKEN.expiresAt,
        DEFAULT_USER.email,
      );

      try {
        await useCase.execute({ token: DEFAULT_EXPIRED_TOKEN.token });
      } catch {
        // expected
      }

      const users = repository.getAllUsers();
      const user = users.find((u) => u.id === DEFAULT_USER.id);
      expect(user!.emailVerified).toBe(false);
      expect(eventBus.getPublishedEvents()).toHaveLength(0);
    });
  });
});
