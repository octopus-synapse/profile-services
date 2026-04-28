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
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { HttpMethod, Route, RouteKind } from '@/shared-kernel/http/route';
import { isRedirect, isResponseWithHeaders } from '@/shared-kernel/http/route';
import type { SseEvent } from '@/shared-kernel/http/sse-stream.port';
import { drainCookieJar, parseCookieHeader } from './cookie-bridge';
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
  for (const cookie of drainCookieJar(ctx)) {
    // Multiple Set-Cookie headers — Elysia accepts an array via the
    // `set-cookie` key on `set.headers`.
    const existing = ec.set.headers['set-cookie'];
    if (existing && Array.isArray(existing)) {
      (existing as string[]).push(cookie);
    } else if (typeof existing === 'string') {
      ec.set.headers['set-cookie'] = [existing, cookie] as unknown as string;
    } else {
      ec.set.headers['set-cookie'] = [cookie] as unknown as string;
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
      const ctx = await buildHttpCtx(route, ec);

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
      }
      if (route.headers) {
        for (const [k, v] of Object.entries(route.headers)) ec.set.headers[k] = v;
      }
      applyResponseHeaders(ctx, ec);
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
