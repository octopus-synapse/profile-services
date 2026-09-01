/**
 * Identify Account Port (Inbound)
 *
 * Use-case interface for the identifier-first auth entry point: given an
 * e-mail, tell the client which branch to render from a single "Enter
 * your e-mail" surface:
 *
 * - `exists: false` → sign-up (create-password step);
 * - `exists && !emailVerified` → resume the e-mail verification flow
 *   (asking for a password would strand the user in a login that can
 *   never complete);
 * - `exists && !hasPassword` → OAuth-only account, point at the social
 *   button instead of a password field;
 * - otherwise → sign-in (password step).
 *
 * Account-enumeration trade-off: this endpoint deliberately reveals
 * whether an e-mail is registered — the same signal `POST /v1/accounts`
 * already leaks via `AccountAlreadyExistsException`. The mitigation is
 * the route's strict per-IP rate limit, not response obfuscation
 * (mirrors the Airbnb/Google identifier-first pattern).
 */

export interface IdentifyAccountQuery {
  email: string;
}

export interface IdentifyAccountResult {
  exists: boolean;
  /** Present only when `exists` — whether the account's e-mail is verified. */
  emailVerified?: boolean;
  /** Present only when `exists` — false for OAuth-only accounts. */
  hasPassword?: boolean;
}

export abstract class IdentifyAccountPort {
  abstract execute(query: IdentifyAccountQuery): Promise<IdentifyAccountResult>;
}
