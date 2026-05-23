/**
 * supertest-shaped wrapper around `fetch` for the Elysia test harness.
 *
 * The legacy suites called `request(app.getHttpServer()).post(path).send(body).set('Cookie', ...)`.
 * That pattern is so pervasive (~580 callsites across 34 files) that
 * it's cheaper to provide a near-identical builder than to mass-rewrite
 * every `await fetch(...)` invocation. Tests just swap
 * `request(app.getHttpServer())` for `app.request`.
 *
 * Surface preserved:
 *   .get / .post / .put / .patch / .delete(path)
 *   .send(body)             — JSON body
 *   .set(name, value)       — request header
 *   .set({ name: value })   — request headers (object form)
 *   .query({ k: v })        — URL query params
 *   .attach(field, filepath) — multipart/form-data file
 *   .field(name, value)      — multipart/form-data field
 *   .expect(status)          — assertion (no-op; tests use `expect(res.status)` directly)
 *   await ...                — yields TestResponse { status, headers, body, text }
 *
 * Differences from real supertest:
 *  - Cookie jar is NOT auto-managed; tests pass cookies explicitly via
 *    `.set('Cookie', '...')`. The legacy AuthHelper used `.set` already.
 *  - `.expect(status)` does not throw — kept for source-compat only.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// biome-ignore lint/suspicious/noExplicitAny: matches supertest's loose `body: any` typing
export interface TestResponse<T = any> {
  readonly status: number;
  readonly headers: Headers;
  readonly body: T;
  readonly text: string;
  /** Convenience for `.headers.getSetCookie()` (Bun-specific). */
  readonly setCookie: string[];
}

/**
 * Extract a cookie value from a `Set-Cookie` header line.
 * P0-006: tokens travel on `access_token` / `refresh_token` cookies after
 * login; tests pull them out via this helper.
 */
export function extractCookieValue(setCookie: string | undefined): string | undefined {
  if (!setCookie) return undefined;
  const eq = setCookie.indexOf('=');
  const semi = setCookie.indexOf(';');
  if (eq === -1) return undefined;
  const end = semi === -1 ? setCookie.length : semi;
  if (end <= eq + 1) return undefined;
  return setCookie.slice(eq + 1, end);
}

/** Pull a token by cookie name from a TestResponse's `setCookie` array. */
export function tokenFromResponse(
  res: { setCookie: string[] },
  name: 'access_token' | 'refresh_token',
): string | undefined {
  return extractCookieValue(res.setCookie.find((c) => c.startsWith(`${name}=`)));
}

/** Find the raw `Set-Cookie` line for a given cookie name. */
export function rawCookieFromResponse(
  res: { setCookie: string[] },
  name: string,
): string | undefined {
  return res.setCookie.find((c) => c.startsWith(`${name}=`));
}

interface MultipartPart {
  readonly type: 'field' | 'file';
  readonly name: string;
  readonly value?: string;
  readonly filepath?: string;
  readonly contentType?: string;
}

class RequestBuilder implements PromiseLike<TestResponse> {
  private readonly headers = new Headers();
  private queryParams: Record<string, string | string[]> | null = null;
  private bodyJson: unknown = undefined;
  private multipart: MultipartPart[] = [];

  constructor(
    private readonly baseUrl: string,
    private readonly method: HttpMethod,
    private readonly path: string,
  ) {}

  set(name: string, value: string): this;
  set(headers: Record<string, string>): this;
  set(nameOrHeaders: string | Record<string, string>, value?: string): this {
    if (typeof nameOrHeaders === 'string' && value !== undefined) {
      this.headers.set(nameOrHeaders, value);
    } else if (typeof nameOrHeaders === 'object') {
      for (const [k, v] of Object.entries(nameOrHeaders)) this.headers.set(k, v);
    }
    return this;
  }

  send(body: unknown): this {
    this.bodyJson = body;
    return this;
  }

  query(params: Record<string, string | string[] | number | boolean | undefined>): this {
    const out: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      out[k] = Array.isArray(v) ? v.map(String) : String(v);
    }
    this.queryParams = out;
    return this;
  }

  attach(field: string, filepath: string, contentType?: string): this {
    this.multipart.push({ type: 'file', name: field, filepath, contentType });
    return this;
  }

  field(name: string, value: string): this {
    this.multipart.push({ type: 'field', name, value });
    return this;
  }

  /** Source-compat shim — supertest throws on mismatch; we don't. Tests
   *  should assert `expect(res.status).toBe(...)` after `await`. */
  expect(_status: number): this {
    return this;
  }

  /** Source-compat shim. fetch has no per-request timeout knob; tests
   *  that needed `.timeout(ms)` did so for slow PDF generation, which
   *  is bounded server-side now. */
  timeout(_ms: number): this {
    return this;
  }

  /** Source-compat shim. supertest used `.responseType('blob')` to keep
   *  binary bodies as Buffers. fetch always returns text/Buffer per the
   *  body parser, so this is a no-op. */
  responseType(_type: string): this {
    return this;
  }

  private buildUrl(): string {
    let url = `${this.baseUrl}${this.path}`;
    if (this.queryParams) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(this.queryParams)) {
        if (Array.isArray(v)) for (const it of v) params.append(k, it);
        else params.set(k, v);
      }
      url += `?${params.toString()}`;
    }
    return url;
  }

  private buildBody(): BodyInit | null {
    if (this.multipart.length > 0) {
      const form = new FormData();
      for (const part of this.multipart) {
        if (part.type === 'field' && part.value !== undefined) {
          form.append(part.name, part.value);
        } else if (part.type === 'file' && part.filepath) {
          const bytes = readFileSync(part.filepath);
          const blob = new Blob([new Uint8Array(bytes)], {
            type: part.contentType ?? 'application/octet-stream',
          });
          form.append(part.name, blob, basename(part.filepath));
        }
      }
      return form;
    }
    if (this.bodyJson !== undefined) {
      if (!this.headers.has('content-type')) {
        this.headers.set('content-type', 'application/json');
      }
      return JSON.stringify(this.bodyJson);
    }
    return null;
  }

  async exec(): Promise<TestResponse> {
    const body = this.buildBody();
    const res = await fetch(this.buildUrl(), {
      method: this.method,
      headers: this.headers,
      body: body ?? undefined,
    });
    const ct = res.headers.get('content-type') ?? '';
    // Binary responses (PNG QR codes, OG images, PDFs) need to come
    // back as Buffer so specs can do `Buffer.isBuffer(body)` and read
    // the magic-byte prefix. `res.text()` would re-decode the bytes
    // through UTF-8 and corrupt them.
    const isBinary =
      ct.startsWith('image/') ||
      ct === 'application/pdf' ||
      ct === 'application/octet-stream' ||
      ct.startsWith('font/') ||
      ct.startsWith('audio/') ||
      ct.startsWith('video/');
    let text = '';
    let parsed: unknown;
    if (isBinary) {
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);
      parsed = buf;
      text = '';
    } else {
      text = await res.text();
      parsed = text;
      if (ct.includes('application/json') && text.length > 0) {
        try {
          parsed = JSON.parse(text);
        } catch {
          // leave parsed as raw text
        }
      }
    }
    const setCookie =
      typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie ===
      'function'
        ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
        : res.headers.get('set-cookie')
          ? [res.headers.get('set-cookie') as string]
          : [];
    return { status: res.status, headers: res.headers, body: parsed, text, setCookie };
  }

  // biome-ignore lint/suspicious/noThenProperty: thenable lets `await builder` execute the request, mirroring supertest's API.
  then<TResult1 = TestResponse, TResult2 = never>(
    onfulfilled?: ((value: TestResponse) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export interface TestRequest {
  get(path: string): RequestBuilder;
  post(path: string): RequestBuilder;
  put(path: string): RequestBuilder;
  patch(path: string): RequestBuilder;
  delete(path: string): RequestBuilder;
  head(path: string): RequestBuilder;
  options(path: string): RequestBuilder;
}

export function createTestRequest(baseUrl: string): TestRequest {
  const make =
    (method: HttpMethod) =>
    (path: string): RequestBuilder =>
      new RequestBuilder(baseUrl, method, path);
  return {
    get: make('GET'),
    post: make('POST'),
    put: make('PUT'),
    patch: make('PATCH'),
    delete: make('DELETE'),
    head: make('HEAD'),
    options: make('OPTIONS'),
  };
}
