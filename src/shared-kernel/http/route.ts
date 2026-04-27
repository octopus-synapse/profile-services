/**
 * Route descriptor — the **only** public contract between application
 * code and the HTTP framework. A `Route` is plain data; an adapter
 * (Nest today, Elysia/Fastify/Hono tomorrow) consumes `Route[]` and
 * wires real endpoints.
 *
 * See `/home/enzoferracini/.claude/plans/vivid-scribbling-cake.md`
 * (section A) for the design and migration strategy.
 */

import type { ZodSchema } from 'zod';
import type { Permission } from '../authorization';
import type { HandlerResult, HttpCtx } from './context';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** How the adapter parses the incoming body and shapes the outgoing
 *  response. Defaults to `'json'` when omitted. */
export type RouteKind = 'json' | 'sse' | 'multipart' | 'stream';

export interface AuthSpec {
  /**
   * - `jwt`: route requires a valid JWT; pipeline populates `ctx.user`.
   * - `public`: anonymous access allowed; `ctx.user` stays `null`.
   * - `optional`: tries JWT but doesn't fail if absent.
   */
  readonly kind: 'jwt' | 'public' | 'optional';
}

export interface OpenApiMeta {
  readonly summary: string;
  readonly tags: readonly string[];
  readonly description?: string;
  /** Free-form extension hooks the generator passes through verbatim. */
  readonly extensions?: Record<string, unknown>;
}

export interface SdkMeta {
  /** When `true`, the SDK generator emits a method for this route. */
  readonly exported: boolean;
  /** Optional override for the generated method name (camelCase). */
  readonly name?: string;
}

/** Pipeline stages a Route can opt out of. Stage names are the literal
 *  strings registered in `pipeline.ts`. Keep this loose (`string`) so we
 *  don't have to refactor every route every time we add a stage. */
export type PipelineStageName =
  | 'requestLogging'
  | 'cors'
  | 'rateLimit'
  | 'authExtractor'
  | 'errorMapper'
  | 'responseWrapper'
  | 'humanRelativeDates'
  | 'consentGuard'
  | 'emailVerifiedGuard'
  | (string & {});

/**
 * The `handler` is a pure async function that receives the parsed
 * `HttpCtx`. The use-case bundle is closed over via the BC's
 * `buildXyzRoutes(bc)` factory, so the handler itself takes only `ctx`.
 */
export type RouteHandler<
  TBody = unknown,
  TQuery = Record<string, string | string[] | undefined>,
  TParams = Record<string, string>,
> = (ctx: HttpCtx<TBody, TQuery, TParams>) => Promise<HandlerResult>;

/** Per-route middleware — the escape hatch for the ~5% of routes that
 *  need behaviour the global pipeline doesn't cover (custom rate-limit
 *  configs, bespoke consent variants). Runs after global pipeline,
 *  before the handler. */
export type RouteMiddleware = (ctx: HttpCtx) => Promise<void>;

export interface Route<
  TBody = unknown,
  TQuery = Record<string, string | string[] | undefined>,
  TParams = Record<string, string>,
> {
  readonly method: HttpMethod;
  readonly path: string;

  readonly auth: AuthSpec;
  readonly permission?: Permission;

  /** Body / query / params validation. Adapter runs Zod parse and
   *  populates `ctx.body | ctx.query | ctx.params` with the parsed
   *  output. When omitted, the raw shape passes through unchanged. */
  readonly body?: ZodSchema<TBody>;
  readonly query?: ZodSchema<TQuery>;
  readonly params?: ZodSchema<TParams>;

  /** Used by the SDK generator + OpenAPI doc. Optional — routes that
   *  return raw text/streams (Prometheus metrics, SSE) leave it off. */
  readonly response?: ZodSchema<unknown>;

  readonly openapi: OpenApiMeta;
  readonly sdk?: SdkMeta;

  readonly kind?: RouteKind;
  readonly skip?: readonly PipelineStageName[];
  readonly middleware?: readonly RouteMiddleware[];

  readonly handler: RouteHandler<TBody, TQuery, TParams>;
}
