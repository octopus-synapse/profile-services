import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import { SessionTerminatedEvent } from '../../../domain/events';
import type { CookieReader, CookieWriter } from '../../../domain/ports/session-storage.port';
import { InMemorySessionStorage, InMemoryTokenGenerator } from '../../../testing';
import { TerminateSessionUseCase } from './terminate-session.use-case';

// ═══════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════

function createCookieReader(cookies: Record<string, string> = {}): CookieReader {
  return { getCookie: (name: string) => cookies[name] };
}

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

describe('TerminateSessionUseCase', () => {
  let useCase: TerminateSessionUseCase;
  let tokenGenerator: InMemoryTokenGenerator;
  let sessionStorage: InMemorySessionStorage;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    tokenGenerator = new InMemoryTokenGenerator();
    sessionStorage = new InMemorySessionStorage();
    eventBus = new InMemoryEventBus();
    useCase = new TerminateSessionUseCase(tokenGenerator, sessionStorage, eventBus);
  });

  it('clears cookie and publishes SessionTerminatedEvent with reason logout', async () => {
    // Arrange
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
    const cookieWriter = createCookieWriter();

    // Act
    const result = await useCase.execute({ cookieReader, cookieWriter });

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toBe('Session terminated successfully');

    // Cookie was cleared
    expect(cookieWriter.cleared).toContain('session');

    // Event published with reason 'logout'
    expect(eventBus.hasPublished(SessionTerminatedEvent)).toBe(true);
    const events = eventBus.getEventsByType(SessionTerminatedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].sessionId).toBe('session-1');
    expect(events[0].userId).toBe('user-1');
    expect(events[0].reason).toBe('logout');
  });

  it('publishes SessionTerminatedEvent with reason revoked when terminateAllSessions is true', async () => {
    // Arrange
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      sub: 'user-1',
      email: 'test@example.com',
      sessionId: 'session-2',
      iat: nowInSeconds,
      exp: nowInSeconds + 3600,
    };
    tokenGenerator.setValidSessionToken('session-token', payload);

    const cookieReader = createCookieReader({ session: 'session-token' });
    const cookieWriter = createCookieWriter();

    // Act
    const result = await useCase.execute({
      cookieReader,
      cookieWriter,
      terminateAllSessions: true,
    });

    // Assert
    expect(result.success).toBe(true);

    const events = eventBus.getEventsByType(SessionTerminatedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe('revoked');
  });

  it('clears cookie and does not publish event when token is invalid', async () => {
    // Arrange - token not registered in generator, verifySessionToken will throw
    const cookieReader = createCookieReader({ session: 'invalid-token' });
    const cookieWriter = createCookieWriter();

    // Act
    const result = await useCase.execute({ cookieReader, cookieWriter });

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toBe('Session terminated successfully');

    // Cookie was still cleared
    expect(cookieWriter.cleared).toContain('session');

    // No event published (graceful handling)
    expect(eventBus.hasPublished(SessionTerminatedEvent)).toBe(false);
    expect(eventBus.getPublishedEvents()).toHaveLength(0);
  });

  it('clears cookie and does not publish event when no session cookie exists', async () => {
    // Arrange - empty cookie reader
    const cookieReader = createCookieReader({});
    const cookieWriter = createCookieWriter();

    // Act
    const result = await useCase.execute({ cookieReader, cookieWriter });

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toBe('Session terminated successfully');

    // Cookie clear was still called
    expect(cookieWriter.cleared).toContain('session');

    // No event published
    expect(eventBus.hasPublished(SessionTerminatedEvent)).toBe(false);
    expect(eventBus.getPublishedEvents()).toHaveLength(0);
  });
});
