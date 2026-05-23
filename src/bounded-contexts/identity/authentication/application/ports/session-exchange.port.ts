/**
 * Session-Exchange Outbound Port (V2 D42 mobile flow).
 *
 * One-shot store mapping an opaque `sessionExchangeId` to the userId
 * that minted it. The native client opted out of cookies via
 * `Accept-Mode: tokens`, receives the exchange id in the login /
 * verify-2fa response body, then immediately swaps it for a real
 * access/refresh token pair via `POST /v1/auth/session/tokens`.
 *
 * Implementations MUST:
 *   - Honour the TTL (consumer treats absent value as
 *     `SessionExchangeInvalidException`).
 *   - Make `consume()` atomic against concurrent callers: the second
 *     reader of the same id receives `null` even if both arrive within
 *     the TTL window — this guarantees the exchange is one-shot.
 */

export interface SessionExchangePayload {
  readonly userId: string;
  readonly email: string;
}

export abstract class SessionExchangePort {
  /** Store the payload under `id` and return after the write commits.
   *  TTL is in seconds and is enforced by the adapter (Redis / in-memory). */
  abstract store(id: string, payload: SessionExchangePayload, ttlSeconds: number): Promise<void>;

  /** Atomically read-and-delete the payload. Returns `null` when the id
   *  was never stored, the TTL elapsed, or another caller already
   *  consumed it. */
  abstract consume(id: string): Promise<SessionExchangePayload | null>;
}
