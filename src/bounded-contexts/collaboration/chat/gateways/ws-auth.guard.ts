import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { AUTH_CONFIG } from '@/shared-kernel/constants/app.constants';

export interface WsJwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  sessionId?: string;
}

export type AuthenticatedSocket = Socket & { userId: string };

/**
 * WebSocket Authentication Guard
 *
 * Extracts and verifies JWT from the Socket.IO handshake.
 * Priority: httpOnly cookie → auth.token → query.token → Authorization header.
 *
 * Cookie-first is consistent with the HTTP JWT strategy (jwt.strategy.ts).
 * Token sources 2-4 serve non-browser clients and testing.
 */
export class WsAuthGuard {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async authenticate(client: Socket): Promise<string | null> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn('Connection rejected: no token provided');
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync<WsJwtPayload>(token);
      return payload.sub;
    } catch {
      this.logger.warn('Connection rejected: invalid token');
      return null;
    }
  }

  private extractToken(client: Socket): string | null {
    // 1. httpOnly session cookie (browser clients)
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const token = this.parseCookie(cookieHeader, AUTH_CONFIG.SESSION_COOKIE_NAME);
      if (token) return token;
    }

    // 2. Socket.IO auth object (programmatic clients)
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    if (typeof auth?.token === 'string') return auth.token;

    // 3. Query string (fallback for environments without cookie/auth support)
    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string') return queryToken;

    // 4. Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

    return null;
  }

  private parseCookie(cookieHeader: string, name: string): string | null {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  }
}
