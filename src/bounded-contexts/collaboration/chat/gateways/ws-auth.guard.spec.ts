import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { WsAuthGuard } from './ws-auth.guard';

function createMockSocket(
  overrides: {
    cookie?: string;
    authToken?: string;
    queryToken?: string;
    authorizationHeader?: string;
  } = {},
): Socket {
  return {
    handshake: {
      headers: {
        cookie: overrides.cookie,
        authorization: overrides.authorizationHeader,
      },
      auth: overrides.authToken ? { token: overrides.authToken } : {},
      query: overrides.queryToken ? { token: overrides.queryToken } : {},
    },
  } as unknown as Socket;
}

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let jwtService: JwtService;
  let mockVerifyAsync: ReturnType<typeof mock>;

  beforeEach(() => {
    mockVerifyAsync = mock(() => Promise.resolve({ sub: 'user-123', email: 'test@example.com' }));
    jwtService = {
      verifyAsync: mockVerifyAsync,
    } as unknown as JwtService;
    guard = new WsAuthGuard(jwtService);
  });

  it('authenticates from httpOnly session cookie', async () => {
    const client = createMockSocket({ cookie: 'session=jwt-token-from-cookie; Path=/' });

    const userId = await guard.authenticate(client);

    expect(userId).toBe('user-123');
    expect(mockVerifyAsync).toHaveBeenCalledWith('jwt-token-from-cookie');
  });

  it('authenticates from socket.io auth.token', async () => {
    const client = createMockSocket({ authToken: 'jwt-from-auth' });

    const userId = await guard.authenticate(client);

    expect(userId).toBe('user-123');
    expect(mockVerifyAsync).toHaveBeenCalledWith('jwt-from-auth');
  });

  it('authenticates from query string token', async () => {
    const client = createMockSocket({ queryToken: 'jwt-from-query' });

    const userId = await guard.authenticate(client);

    expect(userId).toBe('user-123');
    expect(mockVerifyAsync).toHaveBeenCalledWith('jwt-from-query');
  });

  it('authenticates from Authorization Bearer header', async () => {
    const client = createMockSocket({ authorizationHeader: 'Bearer jwt-from-header' });

    const userId = await guard.authenticate(client);

    expect(userId).toBe('user-123');
    expect(mockVerifyAsync).toHaveBeenCalledWith('jwt-from-header');
  });

  it('prioritizes cookie over other token sources', async () => {
    const client = createMockSocket({
      cookie: 'session=cookie-token',
      authToken: 'auth-token',
      queryToken: 'query-token',
      authorizationHeader: 'Bearer header-token',
    });

    await guard.authenticate(client);

    expect(mockVerifyAsync).toHaveBeenCalledWith('cookie-token');
  });

  it('returns null when no token is provided', async () => {
    const client = createMockSocket();

    const userId = await guard.authenticate(client);

    expect(userId).toBeNull();
    expect(mockVerifyAsync).not.toHaveBeenCalled();
  });

  it('returns null when token verification fails', async () => {
    mockVerifyAsync = mock(() => Promise.reject(new Error('expired')));
    jwtService.verifyAsync = mockVerifyAsync;
    const client = createMockSocket({ cookie: 'session=expired-token' });

    const userId = await guard.authenticate(client);

    expect(userId).toBeNull();
  });

  it('handles URL-encoded cookie values', async () => {
    const client = createMockSocket({ cookie: 'session=eyJhbGciOiJIUzI1NiJ9%2EeyJzdWIiOiIxIn0' });

    await guard.authenticate(client);

    expect(mockVerifyAsync).toHaveBeenCalledWith('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0');
  });

  it('ignores cookies with wrong name', async () => {
    const client = createMockSocket({ cookie: 'other=some-value; path=/' });

    const userId = await guard.authenticate(client);

    expect(userId).toBeNull();
  });
});
