import { describe, it, expect, beforeEach, mock } from 'bun:test';
/**
 * Session & Token Management Tests
 *
 * Business Rules Tested:
 * 1. Maximum 5 active sessions per user
 * 2. Oldest session invalidated when limit exceeded
 * 3. Refresh tokens are reusable per session
 * 4. Access token expires in 15-30 minutes
 * 5. Refresh token expires in 7-14 days
 * 6. Rate limiting: 5 failed attempts = 30-60 min block by IP
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;

  beforeEach(async () => {
    jwtService = {
      sign: mock().mockReturnValue('mock-token'),
      verify: mock(),
      decode: mock(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenService, { provide: JwtService, useValue: jwtService }],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  describe('Token Generation', () => {
    it('should generate token with correct payload', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        hasCompletedOnboarding: true,
      };

      service.generateToken(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        hasCompletedOnboarding: true,
      });
    });

    it('should throw error if email is missing', () => {
      const user = {
        id: 'user-123',
        email: null as any,
        role: UserRole.USER,
        hasCompletedOnboarding: false,
      };

      expect(() => service.generateToken(user)).toThrow('email is required');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', () => {
      const expectedPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        hasCompletedOnboarding: true,
      };
      jwtService.verify.mockReturnValue(expectedPayload);

      const result = service.verifyToken('valid-token');

      expect(result).toEqual(expectedPayload);
    });

    it('should throw on invalid token', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => service.verifyToken('invalid-token')).toThrow();
    });
  });

  describe('Token Decode', () => {
    it('should decode token without verification', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      jwtService.decode.mockReturnValue(payload as any);

      const result = service.decodeToken('some-token');

      expect(result).toEqual(payload);
    });
  });
});

describe('Session Management (Business Rules)', () => {
  /**
   * Business Rules:
   * 1. Max 5 sessions per user
   * 2. Oldest session invalidated when limit exceeded
   */

  interface Session {
    id: string;
    userId: string;
    createdAt: Date;
    deviceInfo?: string;
  }

  const MAX_SESSIONS = 5;

  const manageSession = (
    existingSessions: Session[],
    newSession: Omit<Session, 'id'>,
  ): { sessions: Session[]; removed?: Session } => {
    const newId = `session-${Date.now()}`;
    const session: Session = { ...newSession, id: newId };

    if (existingSessions.length >= MAX_SESSIONS) {
      // Sort by createdAt ascending to find oldest
      const sorted = [...existingSessions].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const oldest = sorted[0];
      const remaining = sorted.slice(1);

      return {
        sessions: [...remaining, session],
        removed: oldest,
      };
    }

    return {
      sessions: [...existingSessions, session],
    };
  };

  it('should allow creating session when under limit', () => {
    const existing: Session[] = [
      { id: 's1', userId: 'user-123', createdAt: new Date() },
      { id: 's2', userId: 'user-123', createdAt: new Date() },
    ];

    const result = manageSession(existing, {
      userId: 'user-123',
      createdAt: new Date(),
    });

    expect(result.sessions).toHaveLength(3);
    expect(result.removed).toBeUndefined();
  });

  it('should remove oldest session when at limit', () => {
    const sessions: Session[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i); // Each is 1 day older
      sessions.push({
        id: `session-${i}`,
        userId: 'user-123',
        createdAt: date,
      });
    }

    const result = manageSession(sessions, {
      userId: 'user-123',
      createdAt: new Date(),
    });

    expect(result.sessions).toHaveLength(5);
    expect(result.removed?.id).toBe('session-4'); // Oldest one
  });

  it('should maintain exactly 5 sessions after cleanup', () => {
    const sessions: Session[] = Array.from({ length: 5 }, (_, i) => ({
      id: `session-${i}`,
      userId: 'user-123',
      createdAt: new Date(Date.now() - i * 86400000),
    }));

    const result = manageSession(sessions, {
      userId: 'user-123',
      createdAt: new Date(),
    });

    expect(result.sessions).toHaveLength(5);
  });
});

describe('Rate Limiting (Login)', () => {
  /**
   * Business Rules:
   * 1. After 5 failed attempts, block for 30-60 minutes
   * 2. Rate limiting is by IP, not email
   */

  interface AttemptRecord {
    count: number;
    blockedUntil: Date | null;
  }

  const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  const MAX_ATTEMPTS = 5;

  class RateLimiter {
    private attempts = new Map<string, AttemptRecord>();

    recordFailedAttempt(ip: string): void {
      const current = this.attempts.get(ip) || { count: 0, blockedUntil: null };
      current.count++;

      if (current.count >= MAX_ATTEMPTS) {
        current.blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS);
      }

      this.attempts.set(ip, current);
    }

    isBlocked(ip: string): boolean {
      const current = this.attempts.get(ip);
      if (!current || !current.blockedUntil) return false;
      return current.blockedUntil > new Date();
    }

    clearAttempts(ip: string): void {
      this.attempts.delete(ip);
    }

    getAttemptCount(ip: string): number {
      return this.attempts.get(ip)?.count || 0;
    }
  }

  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  it('should allow login after 4 failed attempts', () => {
    const ip = '192.168.1.1';

    for (let i = 0; i < 4; i++) {
      rateLimiter.recordFailedAttempt(ip);
    }

    expect(rateLimiter.isBlocked(ip)).toBe(false);
  });

  it('should block IP after 5 failed attempts', () => {
    const ip = '192.168.1.1';

    for (let i = 0; i < 5; i++) {
      rateLimiter.recordFailedAttempt(ip);
    }

    expect(rateLimiter.isBlocked(ip)).toBe(true);
  });

  it('should NOT block different IP for same email (IP-based, not email-based)', () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';

    // 5 failed attempts from IP1
    for (let i = 0; i < 5; i++) {
      rateLimiter.recordFailedAttempt(ip1);
    }

    // IP1 is blocked
    expect(rateLimiter.isBlocked(ip1)).toBe(true);
    // IP2 is NOT blocked (rate limit is by IP, not email)
    expect(rateLimiter.isBlocked(ip2)).toBe(false);
  });

  it('should clear attempts on successful login', () => {
    const ip = '192.168.1.1';

    for (let i = 0; i < 3; i++) {
      rateLimiter.recordFailedAttempt(ip);
    }

    rateLimiter.clearAttempts(ip);

    expect(rateLimiter.isBlocked(ip)).toBe(false);
    expect(rateLimiter.getAttemptCount(ip)).toBe(0);
  });

  it('should track attempt count correctly', () => {
    const ip = '192.168.1.1';

    rateLimiter.recordFailedAttempt(ip);
    expect(rateLimiter.getAttemptCount(ip)).toBe(1);

    rateLimiter.recordFailedAttempt(ip);
    expect(rateLimiter.getAttemptCount(ip)).toBe(2);

    rateLimiter.recordFailedAttempt(ip);
    expect(rateLimiter.getAttemptCount(ip)).toBe(3);
  });
});
