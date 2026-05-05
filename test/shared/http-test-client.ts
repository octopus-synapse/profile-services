/**
 * Lightweight HTTP test client using native fetch.
 * Drop-in replacement for supertest — provides a chainable API
 * that resolves to a TestResponse with .status, .body, .headers, .text.
 */

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';

export interface TestResponse {
  status: number;
  headers: Record<string, string | string[]>;
  body: unknown;
  text: string;
}

class TestRequest {
  private _headers: Record<string, string> = {};
  private _body?: string | FormData;
  private _query: Record<string, string> = {};
  private _expectedStatus?: number;

  constructor(
    private readonly baseUrl: string,
    private readonly method: string,
    private readonly path: string,
  ) {}

  set(key: string, value: string): this;
  set(headers: Record<string, string>): this;
  set(keyOrHeaders: string | Record<string, string>, value?: string): this {
    if (typeof keyOrHeaders === 'string') {
      this._headers[keyOrHeaders] = value ?? '';
    } else {
      Object.assign(this._headers, keyOrHeaders);
    }
    return this;
  }

  send(body: unknown): this {
    if (typeof body === 'string') {
      this._body = body;
      this._headers['Content-Type'] ??= 'application/json';
    } else {
      this._body = JSON.stringify(body);
      this._headers['Content-Type'] ??= 'application/json';
    }
    return this;
  }

  query(params: Record<string, string | number>): this {
    for (const [k, v] of Object.entries(params)) {
      this._query[k] = String(v);
    }
    return this;
  }

  type(contentType: string): this {
    this._headers['Content-Type'] = contentType;
    return this;
  }

  /** Assert expected status code (supertest compat). Throws if mismatch. */
  expect(status: number): this {
    this._expectedStatus = status;
    return this;
  }

  /** Execute the request and return a TestResponse (also works as a thenable). */
  // biome-ignore lint/suspicious/noThenProperty: intentional thenable for supertest compat
  async then<TResult1 = TestResponse, TResult2 = never>(
    onfulfilled?: ((value: TestResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const result = await this.execute();
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  private async execute(): Promise<TestResponse> {
    let url = `${this.baseUrl}${this.path}`;
    const qs = new URLSearchParams(this._query).toString();
    if (qs) url += `?${qs}`;

    const init: RequestInit = {
      method: this.method,
      headers: this._headers,
      redirect: 'manual',
    };

    if (this._body && this.method !== 'GET' && this.method !== 'HEAD') {
      init.body = this._body;
    }

    const res = await fetch(url, init);
    const ct = res.headers.get('content-type') ?? '';

    const isBinary =
      ct.includes('application/pdf') ||
      ct.includes('application/octet-stream') ||
      ct.includes('image/') ||
      ct.includes('application/vnd.');

    let text: string;
    let body: unknown;

    if (isBinary) {
      const buf = Buffer.from(await res.arrayBuffer());
      text = '';
      body = buf;
    } else {
      text = await res.text();
      body = text;
      if (ct.includes('application/json') && text) {
        try {
          body = JSON.parse(text);
        } catch {
          // keep as text
        }
      }
    }

    // Build headers record, handling set-cookie as array
    const headers: Record<string, string | string[]> = {};
    res.headers.forEach((v, k) => {
      if (k === 'set-cookie') {
        const existing = headers[k];
        if (Array.isArray(existing)) {
          existing.push(v);
        } else if (existing) {
          headers[k] = [existing, v];
        } else {
          headers[k] = [v];
        }
      } else {
        headers[k] = v;
      }
    });

    const response: TestResponse = { status: res.status, headers, body, text };

    if (this._expectedStatus !== undefined && res.status !== this._expectedStatus) {
      const preview =
        typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200);
      throw new Error(
        `Expected status ${this._expectedStatus} but got ${res.status} for ${this.method} ${this.path}\n${preview}`,
      );
    }

    return response;
  }
}

export class TestAgent {
  private baseUrl: string;

  constructor(server: Server) {
    const addr = server.address() as AddressInfo;
    this.baseUrl = `http://127.0.0.1:${addr.port}`;
  }

  get(path: string): TestRequest {
    return new TestRequest(this.baseUrl, 'GET', path);
  }

  post(path: string): TestRequest {
    return new TestRequest(this.baseUrl, 'POST', path);
  }

  put(path: string): TestRequest {
    return new TestRequest(this.baseUrl, 'PUT', path);
  }

  patch(path: string): TestRequest {
    return new TestRequest(this.baseUrl, 'PATCH', path);
  }

  delete(path: string): TestRequest {
    return new TestRequest(this.baseUrl, 'DELETE', path);
  }
}

/**
 * Creates a TestAgent from a NestJS application.
 * The app's HTTP server must be listening (call app.listen(0) first).
 */
export function testRequest(app: INestApplication): TestAgent {
  return new TestAgent(app.getHttpServer());
}
