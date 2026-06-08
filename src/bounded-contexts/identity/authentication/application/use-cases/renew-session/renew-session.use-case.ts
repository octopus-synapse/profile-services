/**
 * Renew Session Use Case
 *
 * Reads the current `access_token` cookie, and if it's still valid,
 * re-issues a fresh session cookie with a new expiry window — sliding the
 * "keep me signed in" lifetime. The `persistent` flag rides in the JWT so
 * the renewed cookie keeps the same kind (persistent vs session cookie)
 * without the client re-stating the choice.
 *
 * Pure cookie re-mint: no domain event, no DB write. An invalid/expired/
 * missing cookie is a no-op (`renewed: false`) — the caller still returns
 * `{ ok: true }` so the endpoint never leaks whether a session existed.
 */

import { LoggerPort } from '@/shared-kernel';
import type { SessionPayload } from '../../../domain/ports';
import { SessionStoragePort, TokenGeneratorPort } from '../../../domain/ports';
import type { RenewSessionCommand, RenewSessionPort, RenewSessionResult } from '../../ports';

/** Slice of `ConfigPort` this UC reads (DIP). */
export interface RenewSessionConfigPort {
  get<T>(key: string, defaultValue: T): T;
}

export class RenewSessionUseCase implements RenewSessionPort {
  private readonly sessionExpiryDays: number;
  private readonly persistentExpiryDays: number;

  constructor(
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly sessionStorage: SessionStoragePort,
    private readonly config: RenewSessionConfigPort,
    private readonly logger: LoggerPort,
  ) {
    this.sessionExpiryDays = Number(this.config.get<number>('SESSION_EXPIRY_DAYS', 7)) || 7;
    this.persistentExpiryDays =
      Number(this.config.get<number>('PERSISTENT_SESSION_EXPIRY_DAYS', 30)) || 30;
  }

  async execute(command: RenewSessionCommand): Promise<RenewSessionResult> {
    const { cookieReader, cookieWriter } = command;

    const token = this.sessionStorage.getSessionCookie(cookieReader);
    if (!token) return { renewed: false };

    let payload: SessionPayload;
    try {
      payload = await this.tokenGenerator.verifySessionToken(token);
    } catch (err) {
      this.logger.debug(
        `Session renew skipped — token verify failed: ${err instanceof Error ? err.message : 'unknown'}`,
        'RenewSessionUseCase',
      );
      return { renewed: false };
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (nowInSeconds > payload.exp) return { renewed: false };

    // Back-compat: tokens minted before the `persistent` claim existed were
    // persistent 7-day cookies, so treat an absent flag as persistent.
    const persistent = payload.persistent ?? true;
    const expiryDays = persistent ? this.persistentExpiryDays : this.sessionExpiryDays;

    const now = Date.now();
    const expiresAt = new Date(now + expiryDays * 24 * 60 * 60 * 1000);
    const fresh: SessionPayload = {
      sub: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId, // keep identity continuity across slides
      iat: Math.floor(now / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      persistent,
    };

    const sessionToken = await this.tokenGenerator.generateSessionToken(fresh);
    this.sessionStorage.setSessionCookie(cookieWriter, sessionToken, expiresAt, { persistent });

    return { renewed: true };
  }
}
