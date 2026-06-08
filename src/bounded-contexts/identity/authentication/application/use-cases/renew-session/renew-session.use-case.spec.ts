import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { SessionPayload } from '../../../domain/entities/session.entity';
import type { CookieReader, CookieWriter } from '../../../domain/ports/session-storage.port';
import { InMemorySessionStorage, InMemoryTokenGenerator } from '../../../testing';
import { RenewSessionUseCase } from './renew-session.use-case';

// The InMemorySessionStorage double reads/writes under the cookie name 'session'.
const COOKIE = 'session';

function cookieReaderFor(token: string | undefined): CookieReader {
  return { getCookie: (name: string) => (name === COOKIE ? token : undefined) };
}

function recordingCookieWriter(): CookieWriter & { cookies: Record<string, string> } {
  const writer = {
    cookies: {} as Record<string, string>,
    setCookie: (name: string, value: string) => {
      writer.cookies[name] = value;
    },
    clearCookie: () => undefined,
  };
  return writer;
}

const config = { get: <T>(_key: string, defaultValue: T) => defaultValue };

function futurePayload(persistent: boolean): SessionPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: 'user-1',
    email: 'test@example.com',
    sessionId: 'sess-1',
    iat: now,
    exp: now + 3600,
    persistent,
  };
}

describe('RenewSessionUseCase', () => {
  let useCase: RenewSessionUseCase;
  let tokenGenerator: InMemoryTokenGenerator;
  let sessionStorage: InMemorySessionStorage;

  beforeEach(() => {
    tokenGenerator = new InMemoryTokenGenerator();
    sessionStorage = new InMemorySessionStorage();
    useCase = new RenewSessionUseCase(tokenGenerator, sessionStorage, config, stubLogger);
  });

  it('re-issues a fresh persistent cookie, preserving persistent=true and sliding exp', async () => {
    const payload = futurePayload(true);
    tokenGenerator.setValidSessionToken('old-token', payload);
    const cookieWriter = recordingCookieWriter();

    const result = await useCase.execute({
      cookieReader: cookieReaderFor('old-token'),
      cookieWriter,
    });

    expect(result.renewed).toBe(true);
    expect(sessionStorage.lastPersistent).toBe(true);
    const newToken = cookieWriter.cookies[COOKIE];
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe('old-token');
    const fresh = await tokenGenerator.verifySessionToken(newToken as string);
    expect(fresh.persistent).toBe(true);
    expect(fresh.sub).toBe('user-1');
    expect(fresh.sessionId).toBe('sess-1'); // identity continuity preserved
    expect(fresh.exp).toBeGreaterThan(payload.exp); // window slid forward
  });

  it('preserves a session cookie (persistent=false) on renew', async () => {
    tokenGenerator.setValidSessionToken('old-token', futurePayload(false));
    const cookieWriter = recordingCookieWriter();

    const result = await useCase.execute({
      cookieReader: cookieReaderFor('old-token'),
      cookieWriter,
    });

    expect(result.renewed).toBe(true);
    expect(sessionStorage.lastPersistent).toBe(false);
    const fresh = await tokenGenerator.verifySessionToken(cookieWriter.cookies[COOKIE] as string);
    expect(fresh.persistent).toBe(false);
  });

  it('treats a token without the persistent claim as persistent (back-compat)', async () => {
    const now = Math.floor(Date.now() / 1000);
    tokenGenerator.setValidSessionToken('legacy-token', {
      sub: 'user-1',
      email: 'test@example.com',
      sessionId: 'sess-1',
      iat: now,
      exp: now + 3600,
      // no `persistent` field — minted before the feature
    });
    const cookieWriter = recordingCookieWriter();

    const result = await useCase.execute({
      cookieReader: cookieReaderFor('legacy-token'),
      cookieWriter,
    });

    expect(result.renewed).toBe(true);
    expect(sessionStorage.lastPersistent).toBe(true);
  });

  it('is a no-op when no cookie is present', async () => {
    const cookieWriter = recordingCookieWriter();
    const result = await useCase.execute({
      cookieReader: cookieReaderFor(undefined),
      cookieWriter,
    });
    expect(result.renewed).toBe(false);
    expect(cookieWriter.cookies[COOKIE]).toBeUndefined();
  });

  it('is a no-op when the token is expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    tokenGenerator.setValidSessionToken('expired-token', {
      sub: 'user-1',
      email: 'test@example.com',
      sessionId: 'sess-1',
      iat: now - 7200,
      exp: now - 3600, // expired an hour ago
      persistent: true,
    });
    const cookieWriter = recordingCookieWriter();

    const result = await useCase.execute({
      cookieReader: cookieReaderFor('expired-token'),
      cookieWriter,
    });

    expect(result.renewed).toBe(false);
    expect(cookieWriter.cookies[COOKIE]).toBeUndefined();
  });

  it('is a no-op when the token fails verification', async () => {
    const cookieWriter = recordingCookieWriter();
    const result = await useCase.execute({
      cookieReader: cookieReaderFor('garbage-token'),
      cookieWriter,
    });
    expect(result.renewed).toBe(false);
    expect(cookieWriter.cookies[COOKIE]).toBeUndefined();
  });
});
