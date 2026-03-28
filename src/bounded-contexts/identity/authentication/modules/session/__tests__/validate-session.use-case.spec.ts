/**
 * Unit Tests: Validate Session Use Case
 *
 * Tests session validation logic in isolation.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SessionUserData } from '../../../ports/inbound';
import type {
  AuthenticationRepositoryPort,
  SessionPayload,
  SessionStoragePort,
  TokenGeneratorPort,
} from '../../../ports/outbound';
import type { CookieReader } from '../../../ports/outbound/session-storage.port';
import { ValidateSessionUseCase } from '../validate-session.use-case';

describe('ValidateSessionUseCase', () => {
  // Mocks
  let mockRepository: AuthenticationRepositoryPort;
  let mockTokenGenerator: TokenGeneratorPort;
  let mockSessionStorage: SessionStoragePort;
  let mockCookieReader: CookieReader;

  // SUT
  let useCase: ValidateSessionUseCase;

  // Test data
  const testUserId = 'user-123';
  const testEmail = 'test@example.com';
  const testSessionToken = 'valid-session-token';
  const testPayload: SessionPayload = {
    sub: testUserId,
    email: testEmail,
    sessionId: 'sess-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 1 day from now (in seconds)
  };
  const testUserData: SessionUserData = {
    id: testUserId,
    email: testEmail,
    name: 'Test User',
    username: 'testuser',
    hasCompletedOnboarding: true,
    emailVerified: true,
    role: 'USER',
    roles: ['role_user'],
    isAdmin: false,
    needsOnboarding: false,
    needsEmailVerification: false,
  };

  beforeEach(() => {
    mockRepository = {
      findUserByEmail: mock(() => Promise.resolve(null)),
      findUserById: mock(() => Promise.resolve(null)),
      findSessionUser: mock(() => Promise.resolve(testUserData)),
      createRefreshToken: mock(() => Promise.resolve()),
      findRefreshToken: mock(() => Promise.resolve(null)),
      deleteRefreshToken: mock(() => Promise.resolve()),
      deleteAllUserRefreshTokens: mock(() => Promise.resolve()),
      updateLastLogin: mock(() => Promise.resolve()),
      invalidateSessionCache: mock(() => Promise.resolve()),
      invalidateEmailCache: mock(() => Promise.resolve()),
    };

    mockTokenGenerator = {
      generateTokenPair: mock(() =>
        Promise.resolve({
          accessToken: 'at',
          refreshToken: 'rt',
          expiresIn: 3600,
        }),
      ),
      generateSessionToken: mock(() => Promise.resolve(testSessionToken)),
      verifyAccessToken: mock(() => Promise.resolve({ userId: testUserId, email: testEmail })),
      verifySessionToken: mock(() => Promise.resolve(testPayload)),
      generateRefreshToken: mock(() => 'refresh-token'),
    };

    mockSessionStorage = {
      setSessionCookie: mock(() => {}),
      getSessionCookie: mock(() => testSessionToken),
      clearSessionCookie: mock(() => {}),
      getCookieOptions: mock(() => ({
        httpOnly: true,
        secure: true,
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 604800000,
      })),
    };

    mockCookieReader = {
      getCookie: mock((name: string) => (name === 'session' ? testSessionToken : undefined)),
    };

    useCase = new ValidateSessionUseCase(mockRepository, mockTokenGenerator, mockSessionStorage);
  });

  describe('execute', () => {
    it('should return valid session with user data', async () => {
      const result = await useCase.execute({ cookieReader: mockCookieReader });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(testUserData);
    });

    it('should return invalid when no cookie present', async () => {
      mockSessionStorage.getSessionCookie = mock(() => null);

      const result = await useCase.execute({ cookieReader: mockCookieReader });

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
    });

    it('should return invalid when token verification fails', async () => {
      mockTokenGenerator.verifySessionToken = mock(() => {
        throw new Error('Invalid token');
      });

      const result = await useCase.execute({ cookieReader: mockCookieReader });

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
    });

    it('should return invalid when token is expired', async () => {
      const expiredPayload: SessionPayload = {
        ...testPayload,
        exp: Math.floor(Date.now() / 1000) - 1, // Expired 1 second ago (in seconds)
      };
      mockTokenGenerator.verifySessionToken = mock(() => Promise.resolve(expiredPayload));

      const result = await useCase.execute({ cookieReader: mockCookieReader });

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
    });

    it('should return invalid when user not found', async () => {
      mockRepository.findSessionUser = mock(() => Promise.resolve(null));

      const result = await useCase.execute({ cookieReader: mockCookieReader });

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
    });

    it('should return invalid when verifySessionToken returns null', async () => {
      mockTokenGenerator.verifySessionToken = mock(() =>
        Promise.resolve(null as unknown as SessionPayload),
      );

      const result = await useCase.execute({ cookieReader: mockCookieReader });

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
    });
  });
});
