import { randomBytes } from 'node:crypto';
import type { LoggerPort } from '@/shared-kernel';
import type { SessionExchangePort } from '../../ports/session-exchange.port';

/**
 * V2 D42 — session-exchange TTL. A native client that opted into
 * `Accept-Mode: tokens` is expected to call `POST /v1/auth/session/tokens`
 * within the same request cycle as the originating login. 60 seconds
 * is long enough to survive transient network blips but short enough
 * that a leaked id is already useless by the time anyone outside the
 * legitimate client could replay it.
 */
const SESSION_EXCHANGE_TTL_SECONDS = 60;

export interface CreateSessionExchangeCommand {
  readonly userId: string;
  readonly email: string;
}

export interface CreateSessionExchangeResult {
  readonly sessionExchangeId: string;
}

/**
 * Mints a one-shot `sessionExchangeId` and persists the userId/email
 * mapping in the `SessionExchangePort` cache with a short TTL.
 *
 * Called by the login + verify-2fa route handlers when the request
 * arrives with `Accept-Mode: tokens` AND the flow reached a successful
 * session-issuance point (no 2FA challenge pending). The mobile client
 * follows up immediately with `POST /v1/auth/session/tokens` carrying
 * the returned id to receive a real access/refresh token pair.
 */
export class CreateSessionExchangeUseCase {
  constructor(
    private readonly sessionExchange: SessionExchangePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: CreateSessionExchangeCommand): Promise<CreateSessionExchangeResult> {
    const id = `sxc_${randomBytes(32).toString('base64url')}`;
    await this.sessionExchange.store(
      id,
      { userId: command.userId, email: command.email },
      SESSION_EXCHANGE_TTL_SECONDS,
    );
    this.logger.debug('Issued session exchange id', 'CreateSessionExchangeUseCase', {
      userId: command.userId,
    });
    return { sessionExchangeId: id };
  }
}
