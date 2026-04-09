/**
 * Login Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { AccountDeactivatedException } from '../../../../account-lifecycle/domain/exceptions';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import type {
  Validate2faInboundPort,
  Validate2faResult,
} from '../../../../two-factor-auth/application/ports';
import { LoginFailedEvent, UserLoggedInEvent } from '../../../domain/events';
import { Invalid2faCodeException, InvalidCredentialsException } from '../../../domain/exceptions';
import {
  InMemoryAuthenticationRepository,
  InMemoryPasswordHasher,
  InMemoryTokenGenerator,
} from '../../../testing';
import { LoginUseCase } from './login.use-case';

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY VALIDATE 2FA
// ═══════════════════════════════════════════════════════════════

class InMemoryValidate2fa implements Validate2faInboundPort {
  private enabledUsers = new Set<string>();
  private validCodes = new Map<string, { code: string; method: 'totp' | 'backup_code' }>();

  async validate(userId: string, code: string): Promise<Validate2faResult> {
    const entry = this.validCodes.get(userId);
    if (entry && entry.code === code) {
      return { valid: true, method: entry.method };
    }
    return { valid: false, method: null };
  }

  async isEnabled(userId: string): Promise<boolean> {
    return this.enabledUsers.has(userId);
  }

  // Test helpers
  enable(userId: string): void {
    this.enabledUsers.add(userId);
  }

  setValidCode(userId: string, code: string, method: 'totp' | 'backup_code' = 'totp'): void {
    this.validCodes.set(userId, { code, method });
  }

  clear(): void {
    this.enabledUsers.clear();
    this.validCodes.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let repository: InMemoryAuthenticationRepository;
  let passwordHasher: InMemoryPasswordHasher;
  let tokenGenerator: InMemoryTokenGenerator;
  let eventBus: InMemoryEventBus;
  let validate2fa: InMemoryValidate2fa;

  const userId = 'user-123';
  const email = 'john@example.com';
  const password = 'securePassword1!';
  const ipAddress = '192.168.1.1';
  const userAgent = 'TestAgent/1.0';

  beforeEach(() => {
    repository = new InMemoryAuthenticationRepository();
    passwordHasher = new InMemoryPasswordHasher();
    tokenGenerator = new InMemoryTokenGenerator();
    eventBus = new InMemoryEventBus();
    validate2fa = new InMemoryValidate2fa();

    const passwordHash = passwordHasher.hash(password);
    repository.seedUser({ id: userId, email, passwordHash, isActive: true });

    useCase = new LoginUseCase(repository, passwordHasher, tokenGenerator, eventBus, validate2fa);
  });

  // ───────────────────────────────────────────────────────────────
  // execute()
  // ───────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should return tokens and publish UserLoggedInEvent on valid credentials', async () => {
      const result = await useCase.execute({ email, password, ipAddress, userAgent });

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.userId).toBe(userId);

      const refreshTokens = repository.getAllRefreshTokens();
      expect(refreshTokens).toHaveLength(1);
      expect(refreshTokens[0].userId).toBe(userId);

      expect(eventBus.hasPublished(UserLoggedInEvent)).toBe(true);
      const loggedInEvent = eventBus.getEventsByType(UserLoggedInEvent)[0];
      expect(loggedInEvent.userId).toBe(userId);
      expect(loggedInEvent.loginMethod).toBe('password');
      expect(loggedInEvent.ipAddress).toBe(ipAddress);
      expect(loggedInEvent.userAgent).toBe(userAgent);
    });

    it('should throw InvalidCredentialsException and publish LoginFailedEvent when user not found', async () => {
      expect(
        useCase.execute({ email: 'nonexistent@example.com', password, ipAddress }),
      ).rejects.toThrow(InvalidCredentialsException);

      const failedEvents = eventBus.getEventsByType(LoginFailedEvent);
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].reason).toBe('invalid_credentials');
    });

    it('should throw InvalidCredentialsException when user has no password hash', async () => {
      repository.clear();
      repository.seedUser({ id: 'user-no-hash', email, passwordHash: null, isActive: true });

      expect(useCase.execute({ email, password, ipAddress })).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw AccountDeactivatedException and publish LoginFailedEvent when account is inactive', async () => {
      repository.clear();
      repository.seedUser({
        id: userId,
        email,
        passwordHash: passwordHasher.hash(password),
        isActive: false,
      });

      expect(useCase.execute({ email, password, ipAddress })).rejects.toThrow(
        AccountDeactivatedException,
      );

      const failedEvents = eventBus.getEventsByType(LoginFailedEvent);
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].reason).toBe('account_inactive');
    });

    it('should throw InvalidCredentialsException and publish LoginFailedEvent on wrong password', async () => {
      expect(useCase.execute({ email, password: 'wrongPassword', ipAddress })).rejects.toThrow(
        InvalidCredentialsException,
      );

      const failedEvents = eventBus.getEventsByType(LoginFailedEvent);
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].reason).toBe('invalid_credentials');
    });

    it('should return twoFactorRequired when 2FA is enabled without issuing tokens', async () => {
      validate2fa.enable(userId);

      const result = await useCase.execute({ email, password, ipAddress });

      expect(result.twoFactorRequired).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.accessToken).toBe('');
      expect(result.refreshToken).toBe('');
      expect(result.expiresIn).toBe(0);

      const refreshTokens = repository.getAllRefreshTokens();
      expect(refreshTokens).toHaveLength(0);

      expect(eventBus.hasPublished(UserLoggedInEvent)).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // completeWithTwoFactor()
  // ───────────────────────────────────────────────────────────────

  describe('completeWithTwoFactor', () => {
    it('should return tokens and publish UserLoggedInEvent with 2fa_totp method on valid code', async () => {
      validate2fa.setValidCode(userId, '123456', 'totp');

      const result = await useCase.completeWithTwoFactor({
        userId,
        code: '123456',
        ipAddress,
        userAgent,
      });

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.userId).toBe(userId);

      expect(eventBus.hasPublished(UserLoggedInEvent)).toBe(true);
      const loggedInEvent = eventBus.getEventsByType(UserLoggedInEvent)[0];
      expect(loggedInEvent.loginMethod).toBe('2fa_totp');
    });

    it('should throw Invalid2faCodeException and publish LoginFailedEvent on invalid code', async () => {
      validate2fa.setValidCode(userId, '123456', 'totp');

      expect(useCase.completeWithTwoFactor({ userId, code: '000000', ipAddress })).rejects.toThrow(
        Invalid2faCodeException,
      );

      const failedEvents = eventBus.getEventsByType(LoginFailedEvent);
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].reason).toBe('invalid_2fa');
    });

    it('should throw InvalidCredentialsException when user not found', async () => {
      expect(
        useCase.completeWithTwoFactor({ userId: 'nonexistent', code: '123456', ipAddress }),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });
});
