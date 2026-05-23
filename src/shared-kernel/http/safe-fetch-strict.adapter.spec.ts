import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as http from 'node:http';
import type { SafeFetchInit, SafeFetchResponse } from './safe-fetch.port';
import { SafeFetchStrictAdapter } from './safe-fetch-strict.adapter';
import { BodyTooLargeException } from './streaming-fetch';

/**
 * Test subclass: the parent rejects 127.0.0.1 as a private IP via
 * the SSRF guard, which is exactly what we want in production. The
 * test harness needs to talk to localhost, so we bypass the
 * resolve-and-validate gate for fixture URLs.
 */
class TestStrictAdapter extends SafeFetchStrictAdapter {
  override async fetch(url: string, init: SafeFetchInit = {}): Promise<SafeFetchResponse> {
    const parsed = new URL(url);
    return (
      this as unknown as {
        requestWithIpBind(p: URL, ip: string, i: SafeFetchInit): Promise<SafeFetchResponse>;
      }
    ).requestWithIpBind(parsed, parsed.hostname, init);
  }
}

type ServerHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

function startServer(
  handler: ServerHandler,
): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') throw new Error('no address');
      resolve({
        port: addr.port,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

describe('SafeFetchStrictAdapter (P1 #45, #46)', () => {
  let captured: { hostHeader?: string } = {};
  let smallServer: { port: number; close: () => Promise<void> };
  let bigServer: { port: number; close: () => Promise<void> };

  beforeAll(async () => {
    smallServer = await startServer((req, res) => {
      captured.hostHeader = req.headers.host;
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    bigServer = await startServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      // 6 MB body — exceeds the 1 KB test cap and the 5 MB default.
      const chunk = Buffer.alloc(1024 * 1024);
      const send = (i: number): void => {
        if (i >= 6) {
          res.end();
          return;
        }
        res.write(chunk, () => send(i + 1));
      };
      send(0);
    });
  });

  afterAll(async () => {
    await smallServer.close();
    await bigServer.close();
  });

  it('sends Host header with non-default port (P1 #45)', async () => {
    captured = {};
    const adapter = new TestStrictAdapter();
    const url = `http://127.0.0.1:${smallServer.port}/anything`;
    const res = await adapter.fetch(url);
    expect(res.status).toBe(200);
    expect(captured.hostHeader).toBe(`127.0.0.1:${smallServer.port}`);
  });

  it('rejects with BodyTooLargeException when the response exceeds maxResponseBytes (P1 #46)', async () => {
    const adapter = new TestStrictAdapter({ maxResponseBytes: 1024 });
    const url = `http://127.0.0.1:${bigServer.port}/big`;
    await expect(adapter.fetch(url)).rejects.toThrow(BodyTooLargeException);
  });
});
