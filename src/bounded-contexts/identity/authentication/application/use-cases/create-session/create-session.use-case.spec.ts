import { beforeEach, describe, expect, it } from 'bun:test';
import type { ConfigService } from '@nestjs/config';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { SessionCreatedEvent } from '../../../domain/events';
import type { CookieWriter } from '../../../domain/ports/session-storage.port';
import {
  createSessionAuthUser,
  InMemoryAuthenticationRepository,
  InMemorySessionStorage,
  InMemoryTokenGenerator,
} from '../../../testing';
import { CreateSessionUseCase } from './create-session.use-case';

// ═══════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════

function createCookieWriter(): CookieWriter & {
  cookies: Record<string, string>;
  cleared: string[];
} {
  const writer = {
    cookies: {} as Record<string, string>,
    cleared: [] as string[],
    setCookie: (name: string, value: string) => {
      writer.cookies[name] = value;
    },
    clearCookie: (name: string) => {
      writer.cleared.push(name);
    },
  };
  return writer;
}

const mockConfigService = {
  get: <T>(_key: string, defaultValue: T) => defaultValue,
};

describe('CreateSessionUseCase', () => {
  let useCase: CreateSessionUseCase;
  let repository: InMemoryAuthenticationRepository;
  let tokenGenerator: InMemoryTokenGenerator;
  let sessionStorage: InMemorySessionStorage;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    repository = new InMemoryAuthenticationRepository();
    tokenGenerator = new InMemoryTokenGenerator();
    sessionStorage = new InMemorySessionStorage();
    eventBus = new InMemoryEventBus();
    useCase = new CreateSessionUseCase(
      repository,
      tokenGenerator,
      sessionStorage,
      eventBus,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('creates session, sets cookie, returns user data, and publishes SessionCreatedEvent', async () => {
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

    const cookieWriter = createCookieWriter();

    // Act
    const result = await useCase.execute({
      userId: 'user-1',
      email: 'test@example.com',
      cookieWriter,
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser/1.0',
    });

    // Assert - result
    expect(result.success).toBe(true);
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('Test User');
    expect(result.user.username).toBe('testuser');
    expect(result.user.isAdmin).toBe(false);
    expect(result.user.needsOnboarding).toBe(false);
    expect(result.user.needsEmailVerification).toBe(false);

    // Assert - cookie was set
    expect(cookieWriter.cookies.session).toBeDefined();

    // Assert - event published
    expect(eventBus.hasPublished(SessionCreatedEvent)).toBe(true);
    const events = eventBus.getEventsByType(SessionCreatedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].userId).toBe('user-1');
    expect(events[0].ipAddress).toBe('127.0.0.1');
    expect(events[0].userAgent).toBe('TestBrowser/1.0');
  });

  it('throws when user is not found after session creation', async () => {
    // Arrange - no user seeded in repository
    const cookieWriter = createCookieWriter();

    // Act & Assert
    await expect(
      useCase.execute({
        userId: 'nonexistent-user',
        email: 'ghost@example.com',
        cookieWriter,
      }),
    ).rejects.toThrow('User not found after session creation');
  });

  it('returns correct calculated fields for admin user needing onboarding', async () => {
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

    const cookieWriter = createCookieWriter();

    // Act
    const result = await useCase.execute({
      userId: 'admin-1',
      email: 'admin@example.com',
      cookieWriter,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.user.isAdmin).toBe(true);
    expect(result.user.needsOnboarding).toBe(true);
    expect(result.user.needsEmailVerification).toBe(true);
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.roles).toEqual(['role_admin', 'role_user']);
  });
});
