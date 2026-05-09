/**
 * SSRF-defended HTTP fetch port (P0-013, P0-014).
 *
 * User-supplied URLs (post link previews, registered webhook targets)
 * MUST go through a `SafeFetchPort` instead of the global `fetch`. The
 * port enforces:
 *
 *   - Protocol allowlist: `https:` and `http:` only. Blocks `file://`,
 *     `ftp://`, `data:`, `gopher://`, etc.
 *   - DNS resolution + IP allowlist: rejects loopback, private RFC1918,
 *     link-local (incl. AWS/GCP metadata `169.254.169.254`), and the
 *     IPv6 equivalents (`::1`, `fc00::/7`, `::ffff:*` mapped form of
 *     blocked IPv4 ranges).
 *   - Redirect off (`redirect: 'manual'`) so a 30x cannot escape to an
 *     internal target after the initial check.
 *
 * Two implementations exist:
 *
 *   - `SafeFetchAdapter` (default): single resolve + check + fetch.
 *     Acceptable for one-shot reads of attacker-untrusted URLs (link
 *     preview) where DNS rebinding has limited payoff.
 *
 *   - `SafeFetchStrictAdapter`: resolves once, opens the socket against
 *     the resolved IP directly (preserving the original `Host` header).
 *     Imune to DNS rebinding. Use for repeated outbound traffic where
 *     the attacker is motivated (registered webhook targets).
 */

import { DomainException, type DomainExceptionOptions } from '@/shared-kernel/exceptions';

export interface SafeFetchInit {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  readonly headers?: Record<string, string>;
  readonly body?: string | Uint8Array;
  /** Per-request timeout in ms. */
  readonly timeoutMs?: number;
  /** Optional `AbortSignal` from the caller (combined with the timeout). */
  readonly signal?: AbortSignal;
}

export interface SafeFetchResponse {
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;
  readonly headers: Headers;
  text(): Promise<string>;
}

/**
 * Promoted to `DomainException` so the SSRF block reaches the HTTP
 * boundary as a stable 400 with code `SAFE_FETCH_BLOCKED`, and so
 * downstream wrappers can re-throw with `{ cause }` preserving the
 * original DNS/parse failure for log forensics.
 */
export class SafeFetchBlockedError extends DomainException {
  readonly code = 'SAFE_FETCH_BLOCKED';
  readonly statusHint = 400;

  constructor(
    message: string,
    public readonly reason: 'protocol' | 'private-ip' | 'dns-failed' | 'rebinding' | 'invalid-url',
    options: DomainExceptionOptions = {},
  ) {
    super(message, options);
  }
}

export abstract class SafeFetchPort {
  /**
   * Fetch the URL after enforcing protocol + IP allowlist. Throws
   * `SafeFetchBlockedError` when the URL is rejected before any network
   * I/O. Network/protocol errors after that point still surface as
   * regular `Error` instances from the underlying fetch.
   */
  abstract fetch(url: string, init?: SafeFetchInit): Promise<SafeFetchResponse>;
}
