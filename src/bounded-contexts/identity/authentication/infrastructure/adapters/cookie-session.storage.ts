/**
 * Cookie Session Storage Adapter
 *
 * Implements SessionStoragePort using httpOnly cookies.
 * This is the infrastructure layer - it knows about cookies and HTTP.
 *
 * Security Configuration:
 * - httpOnly: true (prevents XSS)
 * - secure: true in production (HTTPS only)
 * - sameSite: 'lax' (CSRF protection)
 */

import { ConfigPort } from '@/shared-kernel/config';
import type {
  CookieReader,
  CookieWriter,
  SessionCookieOptions,
} from '../../domain/ports/session-storage.port';
import { SessionStoragePort } from '../../domain/ports/session-storage.port';

export class CookieSessionStorage implements SessionStoragePort {
  private readonly COOKIE_NAME = 'session';
  private readonly cookieOptions: SessionCookieOptions;

  constructor(private readonly configService: ConfigPort) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const sessionExpiryDays = this.configService.getOrDefault<number>('SESSION_EXPIRY_DAYS', 7);

    this.cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: sessionExpiryDays * 24 * 60 * 60 * 1000, // Convert to milliseconds
      domain: this.configService.get('COOKIE_DOMAIN'),
    };
  }

  setSessionCookie(cookieWriter: CookieWriter, sessionToken: string, expiresAt: Date): void {
    cookieWriter.setCookie(this.COOKIE_NAME, sessionToken, {
      ...this.cookieOptions,
      maxAge: expiresAt.getTime() - Date.now(),
    });
  }

  getSessionCookie(cookieReader: CookieReader): string | null {
    return cookieReader.getCookie(this.COOKIE_NAME) ?? null;
  }

  clearSessionCookie(cookieWriter: CookieWriter): void {
    cookieWriter.clearCookie(this.COOKIE_NAME, {
      httpOnly: this.cookieOptions.httpOnly,
      secure: this.cookieOptions.secure,
      sameSite: this.cookieOptions.sameSite,
      path: this.cookieOptions.path,
      domain: this.cookieOptions.domain,
    });
  }

  getCookieOptions(): SessionCookieOptions {
    return { ...this.cookieOptions };
  }
}
