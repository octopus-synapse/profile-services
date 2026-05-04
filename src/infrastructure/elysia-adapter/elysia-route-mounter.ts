/**
 * Mounts framework-free `Route` descriptors onto an Elysia instance.
 * Replaces the Nest `synthesizeController`. Wraps each handler in the
 * shared pipeline (auth/error/logging/rate-limit/responseWrapper) and
 * handles the four route kinds: json, sse, multipart, stream.
 *
 * Cookie writes staged via `stageSetCookie`/`stageClearCookie` are
 * drained from the cookie jar on `ctx.state` after the handler runs
 * and emitted as `Set-Cookie` headers.
 */

import type Elysia from 'elysia';
import type { Observable } from 'rxjs';
import { ZodError } from 'zod';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { HttpMethod, Route, RouteKind } from '@/shared-kernel/http/route.types';
import { isRedirect, isResponseWithHeaders } from '@/shared-kernel/http/route.types';
import type { SseEvent } from '@/shared-kernel/http/sse-stream.port';
import { drainCookieJarStructured, parseCookieHeader } from './cookie-bridge.adapter';
import { runPipeline } from './elysia-pipeline';
import { parseMultipart } from './multipart-bridge';
import { observableToSseStream, SSE_HEADERS } from './sse-bridge';

type ElysiaCtx = {
  request: Request;
  body: unknown;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
  headers: Record<string, string | undefined>;
  set: { status?: number; headers: Record<string, string>; redirect?: string };
};

export interface RouteGroupBinding<TBundle> {
  readonly bundle: TBundle;
  readonly routes: ReadonlyArray<Route<TBundle>>;
}

export interface MountOptions {
  readonly prefix?: string;
  readonly pipeline?: readonly PipelineStage[];
}

async function buildHttpCtx(route: Route, ec: ElysiaCtx): Promise<HttpCtx> {
  const kind: RouteKind = route.kind ?? 'json';
  let body: unknown = ec.body;
  if (kind === 'multipart') {
    body = await parseMultipart(ec.request);
  } else if (route.body) {
    body = route.body.parse(ec.body);
  }
  const query = route.query ? route.query.parse(ec.query) : ec.query;
  const params = route.params ? route.params.parse(ec.params) : ec.params;

  const cookies = parseCookieHeader(ec.headers.cookie);
  const xff = ec.headers['x-forwarded-for'];
  const ip = typeof xff === 'string' ? xff.split(',')[0]?.trim() : undefined;

  return {
    method: ec.request.method,
    path: new URL(ec.request.url).pathname,
    headers: ec.headers,
    cookies,
    ip,
    userAgent: ec.headers['user-agent'],
    body,
    query: query as HttpCtx['query'],
    params: params as HttpCtx['params'],
    user: null,
    state: {},
  };
}

function applyResponseHeaders(ctx: HttpCtx, ec: ElysiaCtx): void {
  const dynamic = ctx.state.responseHeaders as Record<string, string> | undefined;
  if (dynamic) Object.assign(ec.set.headers, dynamic);

  // Feed cookies through Elysia's native `set.cookie` map so its
  // response builder emits one `Set-Cookie` header per entry. Setting
  // `set.headers['set-cookie']` directly to an array silently drops
  // entries because Bun's `Response`/`Headers` collapses arrays into a
  // single comma-joined value, splitting cookies whose `Expires` field
  // already contains commas.
  const structured = drainCookieJarStructured(ctx);
  if (Object.keys(structured).length > 0) {
    const set = ec.set as { cookie?: Record<string, unknown> };
    if (!set.cookie) set.cookie = {};
    for (const [name, entry] of Object.entries(structured)) {
      set.cookie[name] = entry;
    }
  }
}

export function mountRoutes<TBundle>(
  app: Elysia,
  group: RouteGroupBinding<TBundle>,
  options: MountOptions = {},
): Elysia {
  const prefix = options.prefix ?? '';
  const pipeline = options.pipeline ?? [];
  for (const route of group.routes) {
    const path = `${prefix}${route.path}`;
    const handler = async (ec: ElysiaCtx) => {
      let ctx: HttpCtx;
      try {
        ctx = await buildHttpCtx(route, ec);
      } catch (err) {
        // Validation (`route.body.parse(...)`) runs in `buildHttpCtx`
        // before the pipeline, so a ZodError here would otherwise
        // surface as a 500. Map it to the 400 the API contract
        // promises (`{ success: false, error: { code, message } }`).
        if (err instanceof ZodError) {
          ec.set.status = 400;
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: err.issues,
            },
          };
        }
        throw err;
      }

      const terminal = async (): Promise<void> => {
        const result = await route.handler(ctx, group.bundle);
        if (isRedirect(result)) {
          ec.set.status = result.status;
          ec.set.redirect = result.url;
          ctx.state.responseBody = undefined;
          return;
        }
        if (isResponseWithHeaders(result)) {
          ctx.state.responseHeaders = {
            ...((ctx.state.responseHeaders as Record<string, string> | undefined) ?? {}),
            ...result.headers,
          };
          ctx.state.responseBody = result.body;
          return;
        }
        ctx.state.responseBody = result;
      };

      // SSE branch: the handler returns an Observable<SseEvent<T>>; the
      // pipeline's responseWrapper is auto-skipped (kind:sse opts out).
      if ((route.kind ?? 'json') === 'sse') {
        const skip = new Set(route.skip ?? []);
        skip.add('responseWrapper');
        const sseRoute: Route = { ...route, skip: [...skip] };
        await runPipeline(ctx, sseRoute, pipeline, terminal);
        const observable = ctx.state.responseBody as Observable<SseEvent<unknown>> | undefined;
        if (!observable) return undefined;
        const stream = observableToSseStream(observable);
        for (const [k, v] of Object.entries(SSE_HEADERS)) ec.set.headers[k] = v;
        applyResponseHeaders(ctx, ec);
        return new Response(stream, { headers: ec.set.headers });
      }

      await runPipeline(ctx, route, pipeline, terminal);

      if (ctx.state.responseStatus !== undefined) {
        ec.set.status = ctx.state.responseStatus as number;
      } else if (route.statusCode !== undefined) {
        ec.set.status = route.statusCode;
      } else if (route.method === 'POST') {
        // Honour the documented contract on `Route.statusCode`
        // (route.types.ts:43-45): POST defaults to 201 Created. Any
        // route that wants 200 must declare `statusCode: 200` explicitly.
        ec.set.status = 201;
      }
      if (route.headers) {
        for (const [k, v] of Object.entries(route.headers)) ec.set.headers[k] = v;
      }
      applyResponseHeaders(ctx, ec);
      // Unwrap `StreamableFile` (src/shared-kernel/http/streamable-file.ts)
      // so binary endpoints (`*.png`, PDF exports) emit raw bytes
      // instead of JSON-serialized objects.
      const body = ctx.state.responseBody as unknown;
      if (
        body &&
        typeof body === 'object' &&
        'source' in body &&
        ((body as { source: unknown }).source instanceof Uint8Array ||
          (body as { source: unknown }).source instanceof ArrayBuffer)
      ) {
        return (body as { source: Uint8Array | ArrayBuffer }).source;
      }
      return ctx.state.responseBody;
    };
    const verb = route.method.toLowerCase() as Lowercase<HttpMethod>;
    (app as unknown as Record<string, (p: string, h: typeof handler) => unknown>)[verb](
      path,
      handler,
    );
  }
  return app;
}
