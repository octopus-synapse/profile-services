/**
 * DNS-rebinding-resistant `SafeFetchPort` adapter (P0-014).
 *
 * Use for **repeated outbound traffic to attacker-registered URLs**
 * (webhook delivery). The flow:
 *
 *   1. Resolve the hostname to a concrete IP (DNS lookup, all records).
 *   2. Reject if any resolved IP is private/link-local/loopback (defense
 *      against blind SSRF where the attacker simply registers
 *      `http://10.0.0.1`).
 *   3. Open the TCP/TLS socket against the resolved IP literal directly,
 *      injecting `Host: <original-hostname>` so virtual-hosted servers
 *      still route correctly and TLS SNI uses the original name.
 *
 * Step 3 closes the DNS-rebinding window — the underlying socket is
 * pinned to the IP we already validated. The attacker cannot flip the
 * DNS answer between our pre-check and the actual `connect()`.
 *
 * Implementation uses `node:https`/`node:http` `request` instead of
 * the global `fetch` because Bun/undici do not expose a public hook
 * for "connect to this IP, talk to this hostname".
 */

import { promises as dns } from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import { isPrivateIp } from './private-ip';
import { isLikelyIpLiteral, SafeFetchAdapter } from './safe-fetch.adapter';
import {
  SafeFetchBlockedError,
  type SafeFetchInit,
  type SafeFetchResponse,
} from './safe-fetch.port';

interface SafeFetchStrictOptions {
  readonly defaultTimeoutMs?: number;
}

export class SafeFetchStrictAdapter extends SafeFetchAdapter {
  private readonly strictTimeoutMs: number;

  constructor(options: SafeFetchStrictOptions = {}) {
    super(options);
    this.strictTimeoutMs = options.defaultTimeoutMs ?? 15_000;
  }

  override async fetch(url: string, init: SafeFetchInit = {}): Promise<SafeFetchResponse> {
    const parsed = this.assertUrlParseable(url);
    this.assertProtocol(parsed.protocol);
    const resolvedIp = await this.resolveAndValidate(parsed.hostname);
    return this.requestWithIpBind(parsed, resolvedIp, init);
  }

  private async resolveAndValidate(hostname: string): Promise<string> {
    if (isLikelyIpLiteral(hostname)) {
      if (isPrivateIp(hostname)) {
        throw new SafeFetchBlockedError(`Disallowed IP literal: ${hostname}`, 'private-ip');
      }
      return hostname;
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
    for (const a of addrs) {
      if (isPrivateIp(a.address)) {
        throw new SafeFetchBlockedError(
          `Hostname ${hostname} resolved to disallowed IP ${a.address}`,
          'private-ip',
        );
      }
    }
    // Prefer first record; for v6 hosts the IP literal needs brackets.
    return addrs[0].address;
  }

  private requestWithIpBind(
    parsed: URL,
    ip: string,
    init: SafeFetchInit,
  ): Promise<SafeFetchResponse> {
    const isHttps = parsed.protocol === 'https:';
    const requestFn = isHttps ? https.request : http.request;
    const port = parsed.port ? Number(parsed.port) : isHttps ? 443 : 80;
    const headers: Record<string, string> = {
      ...(init.headers ?? {}),
      Host: parsed.host, // hostname[:port]
    };
    const path = `${parsed.pathname}${parsed.search}`;

    return new Promise<SafeFetchResponse>((resolve, reject) => {
      const req = requestFn({
        host: ip,
        port,
        path,
        method: init.method ?? 'GET',
        headers,
        // Pin TLS SNI to the original hostname so vhosts + cert verify work.
        servername: isHttps ? parsed.hostname : undefined,
        timeout: init.timeoutMs ?? this.strictTimeoutMs,
      });

      req.on('response', (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const responseHeaders = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (v === undefined) continue;
            if (Array.isArray(v)) {
              for (const vv of v) responseHeaders.append(k, vv);
            } else {
              responseHeaders.append(k, v);
            }
          }
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? '',
            ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
            headers: responseHeaders,
            text: () => Promise.resolve(body),
          });
        });
        res.on('error', reject);
      });

      req.on('timeout', () => {
        req.destroy(new Error('SafeFetch request timed out'));
      });
      req.on('error', reject);

      if (init.signal) {
        init.signal.addEventListener(
          'abort',
          () => req.destroy(new Error('SafeFetch aborted by caller signal')),
          { once: true },
        );
      }

      if (init.body !== undefined) {
        req.write(init.body);
      }
      req.end();
    });
  }
}
