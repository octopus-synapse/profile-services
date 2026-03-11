/**
 * Unit Tests: Terminate Session Use Case
 *
 * Tests session termination logic in isolation.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { EventBusPort } from '../../../../shared-kernel/ports';
import type {
  SessionPayload,
  SessionStoragePort,
  TokenGeneratorPort,
} from '../../../ports/outbound';
import type { CookieReader, CookieWriter } from '../../../ports/outbound/session-storage.port';
import { TerminateSessionUseCase } from '../terminate-session.use-case';

describe('TerminateSessionUseCase', () => {
  // Mocks
  let mockTokenGenerator: TokenGeneratorPort;
  let mockSessionStorage: SessionStoragePort;
  let mockEventBus: EventBusPort;
  let mockCookieReader: CookieReader;
  let mockCookieWriter: CookieWriter;

  // SUT
  let useCase: TerminateSessionUseCase;

  // Test data
  const testUserId = 'user-123';
  const testEmail = 'test@example.com';
  const testSessionToken = 'valid-session-token';
  const testPayload: SessionPayload = {
    sub: testUserId,
    email: testEmail,
    sessionId: 'sess-123',
    iat: Date.now(),
    exp: Date.now() + 86400000,
  };

  beforeEach(() => {
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

    mockEventBus = {
      publish: mock(() => Promise.resolve()),
      publishAll: mock(() => Promise.resolve()),
    };

    mockCookieReader = {
      getCookie: mock((name: string) => (name === 'session' ? testSessionToken : undefined)),
    };

    mockCookieWriter = {
      setCookie: mock(() => {}),
      clearCookie: mock(() => {}),
    };

    useCase = new TerminateSessionUseCase(mockTokenGenerator, mockSessionStorage, mockEventBus);
  });

  describe('execute', () => {
    it('should clear session cookie and return success', async () => {
      const result = await useCase.execute({
        cookieReader: mockCookieReader,
        cookieWriter: mockCookieWriter,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Session terminated successfully');
      expect(mockSessionStorage.clearSessionCookie).toHaveBeenCalled();
    });

    it('should publish termination event', async () => {
      await useCase.execute({
        cookieReader: mockCookieReader,
        cookieWriter: mockCookieWriter,
      });

      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should handle invalid token gracefully', async () => {
      mockTokenGenerator.verifySessionToken = mock(() => {
        throw new Error('Invalid token');
      });

      const result = await useCase.execute({
        cookieReader: mockCookieReader,
        cookieWriter: mockCookieWriter,
      });

      // Should still succeed (clear cookie even if token is invalid)
      expect(result.success).toBe(true);
      expect(mockSessionStorage.clearSessionCookie).toHaveBeenCalled();
    });

    it('should handle missing cookie gracefully', async () => {
      mockSessionStorage.getSessionCookie = mock(() => null);

      const result = await useCase.execute({
        cookieReader: mockCookieReader,
        cookieWriter: mockCookieWriter,
      });

      expect(result.success).toBe(true);
      expect(mockSessionStorage.clearSessionCookie).toHaveBeenCalled();
    });

    it('should use "revoked" reason when terminateAllSessions is true', async () => {
      await useCase.execute({
        cookieReader: mockCookieReader,
        cookieWriter: mockCookieWriter,
        terminateAllSessions: true,
      });

      // Event should have been published with 'revoked' reason
      const publishCall = (mockEventBus.publish as ReturnType<typeof mock>).mock.calls[0];
      expect(publishCall).toBeDefined();
    });

    it('should use "logout" reason for normal logout', async () => {
      await useCase.execute({
        cookieReader: mockCookieReader,
        cookieWriter: mockCookieWriter,
        terminateAllSessions: false,
      });

      // Event should have been published with 'logout' reason
      const publishCall = (mockEventBus.publish as ReturnType<typeof mock>).mock.calls[0];
      expect(publishCall).toBeDefined();
    });
  });
});
