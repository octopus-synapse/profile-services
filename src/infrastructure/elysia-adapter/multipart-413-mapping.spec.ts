/**
 * P1 #51 — verify the elysia-route-mounter renders PayloadTooLargeException
 * thrown by `parseMultipart` as 413 + PAYLOAD_TOO_LARGE, not the
 * framework's default 500.
 *
 * The exception is raised inside `buildHttpCtx` BEFORE the pipeline
 * runs, so the errorMapper stage never sees it. This spec pins the
 * direct-mapping branch added next to the ZodError branch.
 */

import { describe, expect, it } from 'bun:test';
import Elysia from 'elysia';
import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { mountRoutes } from './elysia-route-mounter';

interface NoopBundle {
  readonly name: string;
}

function buildAppWithMultipartRoute(maxBytes: number) {
  const route: Route<NoopBundle> = {
    method: 'POST',
    path: '/upload',
    auth: { kind: 'public' },
    kind: 'multipart',
    body: z.any(),
    response: z.object({ ok: z.literal(true) }),
    openapi: { summary: 'Upload', tags: ['test'] },
    handler: async () => ({ ok: true as const }),
  };
  const app = new Elysia();
  // Override the multipart parser via a wrapper route: in this spec we
  // do not invoke the real parseMultipart — we let the route mounter
  // run against a small request body so it normally would succeed,
  // then we craft a fake request below that fails the body cap.
  return mountRoutes(app, { bundle: { name: 'test' }, routes: [route] }, { prefix: '/api' });
}

function buildOversizedMultipartRequest(): Request {
  // 4 KB body, content-length header lying about 10 MB.
  const blob = new Blob([new Uint8Array(4 * 1024)]);
  const form = new FormData();
  form.append('file', blob, 'big.bin');
  const baseReq = new Request('http://localhost/api/upload', { method: 'POST', body: form });
  const headers = new Headers(baseReq.headers);
  headers.set('content-length', String(10 * 1024 * 1024));
  return new Request(baseReq.url, {
    method: baseReq.method,
    headers,
    body: baseReq.body,
  });
}

describe('P1 #51 — elysia-route-mounter maps PayloadTooLargeException to 413', () => {
  it('returns 413 + PAYLOAD_TOO_LARGE when parseMultipart trips the cap', async () => {
    // Default cap inside parseMultipart is 25 MB; we lie about
    // content-length being 10 MB and then leave the cap at the
    // default. Force a tighter cap by intercepting via a custom
    // multipart-parser wrapper isn't trivial without changing the
    // production code, so this spec asserts the SHAPE of the
    // response on the path that DOES trigger PayloadTooLargeException
    // — namely the content-length pre-check using the actual default
    // 25 MB cap is too high to trip cheaply here. Instead, we trip
    // it via the streaming cap on a body big enough to exceed
    // `Number(content-length)` — see below.
    const app = buildAppWithMultipartRoute(25 * 1024 * 1024);

    // Send a request where the content-length pre-check trips (10 MB
    // header on a default 25 MB cap doesn't trip; we instead set the
    // header to 30 MB which exceeds the default cap).
    const blob = new Blob([new Uint8Array(4 * 1024)]);
    const form = new FormData();
    form.append('file', blob, 'small.bin');
    const baseReq = new Request('http://localhost/api/upload', { method: 'POST', body: form });
    const headers = new Headers(baseReq.headers);
    headers.set('content-length', String(30 * 1024 * 1024));
    const lyingReq = new Request(baseReq.url, {
      method: baseReq.method,
      headers,
      body: baseReq.body,
    });

    const res = await app.handle(lyingReq);
    expect(res.status).toBe(413);
    const body = (await res.json()) as { code: string; statusCode: number; params?: unknown };
    expect(body.statusCode).toBe(413);
    expect(body.code).toBe('PAYLOAD_TOO_LARGE');
    expect(body.params).toBeDefined();
  });
});
