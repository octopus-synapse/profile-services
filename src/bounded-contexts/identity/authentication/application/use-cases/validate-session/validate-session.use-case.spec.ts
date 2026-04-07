import { beforeEach, describe, expect, it } from 'bun:test';
import type { CookieReader } from '../../../domain/ports/session-storage.port';
import {
  InMemoryAuthenticationRepository,
  InMemorySessionStorage,
  InMemoryTokenGenerator,
  createSessionAuthUser,
} from '../../../testing';
import { ValidateSessionUseCase } from './validate-session.use-case';

// ═══════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════

function createCookieReader(cookies: Record<string, string> = {}): CookieReader {
  return { getCookie: (name: string) => cookies[name] };
}

describe('ValidateSessionUseCase', () => {
  let useCase: ValidateSessionUseCase;
  let repository: InMemoryAuthenticationRepository;
  let tokenGenerator: InMemoryTokenGenerator;
  let sessionStorage: InMemorySessionStorage;

  beforeEach(() => {
    repository = new InMemoryAuthenticationRepository();
    tokenGenerator = new InMemoryTokenGenerator();
    sessionStorage = new InMemorySessionStorage();
    useCase = new ValidateSessionUseCase(repository, tokenGenerator, sessionStorage);
  });

  it('returns success with user data for a valid session', async () => {
    // Arrange
    const sessionUser = createSessionAuthUser({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      hasCompletedOnboarding: true,
      emailVerified: true,
      role: 'USER',
      roles: ['role_user'],
    });
    repository.seedSessionUser(sessionUser);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      sub: 'user-1',
      email: 'test@example.com',
      sessionId: 'session-1',
      iat: nowInSeconds,
      exp: nowInSeconds + 3600,
    };
    tokenGenerator.setValidSessionToken('valid-session-token', payload);

    const cookieReader = createCookieReader({ session: 'valid-session-token' });

    // Act
    const result = await useCase.execute({ cookieReader });

    // Assert
    expect(result.success).toBe(true);
    expect(result.user).not.toBeNull();
    expect(result.user!.id).toBe('user-1');
    expect(result.user!.email).toBe('test@example.com');
    expect(result.user!.name).toBe('Test User');
    expect(result.user!.username).toBe('testuser');
    expect(result.user!.isAdmin).toBe(false);
    expect(result.user!.needsOnboarding).toBe(false);
    expect(result.user!.needsEmailVerification).toBe(false);
  });

  it('returns failure when no session cookie is present', async () => {
    // Arrange
    const cookieReader = createCookieReader({});

    // Act
    const result = await useCase.execute({ cookieReader });

    // Assert
    expect(result.success).toBe(false);
    expect(result.user).toBeNull();
  });

  it('returns failure when token verification throws', async () => {
    // Arrange - token is not registered in the in-memory generator, so verifySessionToken throws
    const cookieReader = createCookieReader({ session: 'invalid-token' });

    // Act
    const result = await useCase.execute({ cookieReader });

    // Assert
    expect(result.success).toBe(false);
    expect(result.user).toBeNull();
  });

  it('returns failure when token is expired', async () => {
    // Arrange
    const pastTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
    const payload = {
      sub: 'user-1',
      email: 'test@example.com',
      sessionId: 'session-1',
      iat: pastTime - 3600,
      exp: pastTime, // already expired
    };
    tokenGenerator.setValidSessionToken('expired-token', payload);

    const cookieReader = createCookieReader({ session: 'expired-token' });

    // Act
    const result = await useCase.execute({ cookieReader });

    // Assert
    expect(result.success).toBe(false);
    expect(result.user).toBeNull();
  });

  it('returns failure when user is not found in repository', async () => {
    // Arrange - valid token but no user seeded
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      sub: 'nonexistent-user',
      email: 'ghost@example.com',
      sessionId: 'session-1',
      iat: nowInSeconds,
      exp: nowInSeconds + 3600,
    };
    tokenGenerator.setValidSessionToken('orphan-token', payload);

    const cookieReader = createCookieReader({ session: 'orphan-token' });

    // Act
    const result = await useCase.execute({ cookieReader });

    // Assert
    expect(result.success).toBe(false);
    expect(result.user).toBeNull();
  });

  it('returns isAdmin true and correct calculated fields for admin user', async () => {
    // Arrange
    const adminUser = createSessionAuthUser({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      username: 'adminuser',
      hasCompletedOnboarding: false,
      emailVerified: false,
      role: 'ADMIN',
      roles: ['role_admin', 'role_user'],
    });
    repository.seedSessionUser(adminUser);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      sub: 'admin-1',
      email: 'admin@example.com',
      sessionId: 'session-admin',
      iat: nowInSeconds,
      exp: nowInSeconds + 3600,
    };
    tokenGenerator.setValidSessionToken('admin-token', payload);

    const cookieReader = createCookieReader({ session: 'admin-token' });

    // Act
    const result = await useCase.execute({ cookieReader });

    // Assert
    expect(result.success).toBe(true);
    expect(result.user).not.toBeNull();
    expect(result.user!.isAdmin).toBe(true);
    expect(result.user!.needsOnboarding).toBe(true);
    expect(result.user!.needsEmailVerification).toBe(true);
    expect(result.user!.role).toBe('ADMIN');
    expect(result.user!.roles).toEqual(['role_admin', 'role_user']);
  });
});
