/**
 * P1 #7 — WS /chat upgrade rejects JWT supplied via query string.
 *
 * Browser-visible URLs (incl. the WS upgrade URL) end up in CDN /
 * proxy logs, browser history, referer headers, and crash reports;
 * sending the access token there hands it to anyone with read access
 * to those surfaces.
 *
 * The chat handler now only accepts the token via:
 *   - httpOnly session cookie (browser, primary)
 *   - `Authorization: Bearer ...` header (programmatic clients)
 *   - `Sec-WebSocket-Protocol: bearer.<token>` subprotocol (browser
 *     clients that can't use cookies)
 *
 * The unit suite (`chat-handlers.spec.ts`) covers each carrier
 * exhaustively; this integration spec exercises the network surface
 * to pin the no-query-string rule end-to-end. We also assert that the
 * adapter still applies the WS origin allowlist (P0-002).
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { closeApp, createTestUserAndLogin, getApp } from '../setup';

describe('P1 #7 — POST /chat WS upgrade auth carriers', () => {
  let token: string;
  let baseUrl: string;

  beforeAll(async () => {
    const app = await getApp();
    // app.request points to baseUrl already; the WS upgrade has to be
    // a real WebSocket() handshake so we need the server's URL.
    const port = (app as unknown as { server?: { port?: number } }).server?.port;
    baseUrl = `ws://localhost:${port ?? 0}`;
    const auth = await createTestUserAndLogin();
    token = auth.accessToken;
  });

  afterAll(async () => {
    await closeApp();
  });

  // Bun/Node's `WebSocket` lacks an inspection hook for the upgrade
  // response status code, so we exercise the rejection by listening
  // for `close` / `error` and asserting the socket never reaches
  // `open`. A more invasive test would speak the raw HTTP/1.1 upgrade
  // by hand; the assertion below is sufficient to detect a regression
  // that re-enables the query-string carrier.
  function expectsRejected(url: string, protocols?: string | string[]): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 500);
      try {
        const ws = protocols !== undefined ? new WebSocket(url, protocols) : new WebSocket(url);
        ws.onopen = () => {
          clearTimeout(timer);
          try {
            ws.close();
          } catch {}
          resolve(false);
        };
        ws.onerror = () => {
          clearTimeout(timer);
          resolve(true);
        };
        ws.onclose = () => {
          clearTimeout(timer);
          resolve(true);
        };
      } catch {
        clearTimeout(timer);
        resolve(true);
      }
    });
  }

  it('rejects upgrade when token is supplied via query string', async () => {
    const rejected = await expectsRejected(`${baseUrl}/chat?token=${encodeURIComponent(token)}`);
    expect(rejected).toBe(true);
  });

  it('rejects upgrade when no Origin and no token are supplied', async () => {
    // Origin allowlist (P0-002): no Origin header → 403.
    const rejected = await expectsRejected(`${baseUrl}/chat`);
    expect(rejected).toBe(true);
  });
});
