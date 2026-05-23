/**
 * Default `SafeFetchPort` adapter (P0-013).
 *
 * Suitable for **single-shot reads** of attacker-untrusted URLs (post
 * link previews). Resolves the hostname once, asserts the IP is not
 * private/link-local/loopback, then issues a normal `fetch`.
 *
 * Trade-off: the underlying `fetch` resolves DNS again internally, so
 * a sufficiently fast DNS rebinding (TTL=0 + repeated A queries
 * returning a public IP first, then a private one) could in theory
 * route the actual TCP connection to a private address even though our
 * pre-check passed. For one-shot link previews this is a bounded risk;
 * webhooks (repeated traffic to attacker-registered URLs) MUST use
 * `SafeFetchStrictAdapter` instead.
 *
 * Redirects are disabled. A 30x is reported as the response status —
 * caller decides whether to follow (and re-validates if so).
 */

import { promises as dns } from 'node:dns';
import { isPrivateIp } from './private-ip';
import {
  SafeFetchBlockedError,
  type SafeFetchInit,
  SafeFetchPort,
  type SafeFetchResponse,
} from './safe-fetch.port';

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);

interface SafeFetchAdapterOptions {
  /** Default per-request timeout in ms. Override per call via `init.timeoutMs`. */
  readonly defaultTimeoutMs?: number;
}

export class SafeFetchAdapter extends SafeFetchPort {
  private readonly defaultTimeoutMs: number;

  constructor(options: SafeFetchAdapterOptions = {}) {
    super();
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 5_000;
  }

  async fetch(url: string, init: SafeFetchInit = {}): Promise<SafeFetchResponse> {
    const parsed = this.assertUrlParseable(url);
    this.assertProtocol(parsed.protocol);
    await this.assertHostResolvesPublic(parsed.hostname);

    const timeoutMs = init.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    if (init.signal) {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(url, {
        method: init.method ?? 'GET',
        headers: init.headers,
        body: init.body as BodyInit | undefined,
        signal: controller.signal,
        redirect: 'manual',
      });
      return wrapResponse(response);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  protected assertUrlParseable(url: string): URL {
    try {
      return new URL(url);
    } catch {
      throw new SafeFetchBlockedError(`Unparseable URL: ${url}`, 'invalid-url');
    }
  }

  protected assertProtocol(protocol: string): void {
    if (!ALLOWED_PROTOCOLS.has(protocol)) {
      throw new SafeFetchBlockedError(
        `Disallowed protocol: ${protocol}. Only https: and http: are permitted.`,
        'protocol',
      );
    }
  }

  protected async assertHostResolvesPublic(hostname: string): Promise<void> {
    // Reject literal IPs that are private. (`new URL` keeps them as the hostname.)
    if (isLikelyIpLiteral(hostname)) {
      if (isPrivateIp(hostname)) {
        throw new SafeFetchBlockedError(`Disallowed IP literal: ${hostname}`, 'private-ip');
      }
      return;
    }

    let addrs: Array<{ address: string; family: number }>;
    try {
      addrs = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new SafeFetchBlockedError(`DNS lookup failed for ${hostname}`, 'dns-failed');
    }

    if (addrs.length === 0) {
      throw new SafeFetchBlockedError(`No DNS records for ${hostname}`, 'dns-failed');
    }

    const blocked = addrs.find((a) => isPrivateIp(a.address));
    if (blocked) {
      throw new SafeFetchBlockedError(
        `Hostname ${hostname} resolved to disallowed IP ${blocked.address}`,
        'private-ip',
      );
    }
  }
}

export function isLikelyIpLiteral(host: string): boolean {
  if (host.includes(':')) return true; // IPv6
  // IPv4: four numeric octets.
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function wrapResponse(r: Response): SafeFetchResponse {
  return {
    status: r.status,
    statusText: r.statusText,
    ok: r.ok,
    headers: r.headers,
    text: () => r.text(),
  };
}
