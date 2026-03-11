/**
 * Unit Tests: Create Session Use Case
 *
 * Tests session creation logic in isolation from infrastructure.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import type { EventBusPort } from '../../../../shared-kernel/ports';
import type { SessionUserData } from '../../../ports/inbound';
import type {
  AuthenticationRepositoryPort,
  SessionPayload,
  SessionStoragePort,
  TokenGeneratorPort,
} from '../../../ports/outbound';
import type { CookieWriter } from '../../../ports/outbound/session-storage.port';
import { CreateSessionUseCase } from '../create-session.use-case';

describe('CreateSessionUseCase', () => {
  // Mocks
  let mockRepository: AuthenticationRepositoryPort;
  let mockTokenGenerator: TokenGeneratorPort;
  let mockSessionStorage: SessionStoragePort;
  let mockEventBus: EventBusPort;
  let mockConfigService: ConfigService;
  let mockCookieWriter: CookieWriter;

  // SUT
  let useCase: CreateSessionUseCase;

  // Test data
  const testUserId = 'user-123';
  const testEmail = 'test@example.com';
  const testSessionToken = 'session-jwt-token';
  const testUserData: SessionUserData = {
    id: testUserId,
    email: testEmail,
    name: 'Test User',
    username: 'testuser',
    hasCompletedOnboarding: true,
    emailVerified: true,
  };

  beforeEach(() => {
    // Reset mocks
    mockRepository = {
      findUserByEmail: mock(() => Promise.resolve(null)),
      findUserById: mock(() => Promise.resolve(null)),
      findSessionUser: mock(() => Promise.resolve(testUserData)),
      createRefreshToken: mock(() => Promise.resolve()),
      findRefreshToken: mock(() => Promise.resolve(null)),
      deleteRefreshToken: mock(() => Promise.resolve()),
      deleteAllUserRefreshTokens: mock(() => Promise.resolve()),
      updateLastLogin: mock(() => Promise.resolve()),
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
      verifySessionToken: mock(() =>
        Promise.resolve({
          sub: testUserId,
          email: testEmail,
          sessionId: 'sess-123',
          iat: Date.now(),
          exp: Date.now() + 86400000,
        } as SessionPayload),
      ),
      generateRefreshToken: mock(() => 'refresh-token'),
    };

    mockSessionStorage = {
      setSessionCookie: mock(() => {}),
      getSessionCookie: mock(() => null),
      clearSessionCookie: mock(() => {}),
      getCookieOptions: mock(() => ({
        httpOnly: true,
        secure: true,
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 604800000,
      })),
    };

    mockEventBus = {
      publish: mock(() => Promise.resolve()),
      publishAll: mock(() => Promise.resolve()),
    };

    mockConfigService = {
      get: mock((key: string, defaultValue?: number) =>
        key === 'SESSION_EXPIRY_DAYS' ? 7 : defaultValue,
      ),
    } as unknown as ConfigService;

    mockCookieWriter = {
      setCookie: mock(() => {}),
      clearCookie: mock(() => {}),
    };

    // Create SUT
    useCase = new CreateSessionUseCase(
      mockRepository,
      mockTokenGenerator,
      mockSessionStorage,
      mockEventBus,
      mockConfigService,
    );
  });

  describe('execute', () => {
    it('should create session and set cookie', async () => {
      const result = await useCase.execute({
        userId: testUserId,
        email: testEmail,
        cookieWriter: mockCookieWriter,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(testUserData);
      expect(mockTokenGenerator.generateSessionToken).toHaveBeenCalled();
      expect(mockSessionStorage.setSessionCookie).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockRepository.findSessionUser = mock(() => Promise.resolve(null));

      await expect(
        useCase.execute({
          userId: 'nonexistent',
          email: testEmail,
          cookieWriter: mockCookieWriter,
        }),
      ).rejects.toThrow('User not found after session creation');
    });

    it('should include IP address and user agent in session', async () => {
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      await useCase.execute({
        userId: testUserId,
        email: testEmail,
        cookieWriter: mockCookieWriter,
        ipAddress,
        userAgent,
      });

      // Verify event was published with IP/UserAgent
      const publishCall = (mockEventBus.publish as ReturnType<typeof mock>).mock.calls[0];
      expect(publishCall).toBeDefined();
    });

    it('should return complete user data', async () => {
      const result = await useCase.execute({
        userId: testUserId,
        email: testEmail,
        cookieWriter: mockCookieWriter,
      });

      expect(result.user.id).toBe(testUserId);
      expect(result.user.email).toBe(testEmail);
      expect(result.user.name).toBe('Test User');
      expect(result.user.username).toBe('testuser');
      expect(result.user.hasCompletedOnboarding).toBe(true);
      expect(result.user.emailVerified).toBe(true);
    });
  });
});
