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

/**
 * Permission requirement on a route. Either a `Permission` enum entry
 * (the static form: `Permission.RESUME_READ`) or a dynamic
 * `{ resource, action }` pair (the form `RequirePermission('user', 'role_assign')`
 * uses today). The Nest synthesizer maps both to the existing
 * `RequirePermission(...)` decorator overload.
 */
export type PermissionRequirement = Permission | { resource: string; action: string };

/**
 * Custom guard spec — escape hatch for guards that aren't
 * Jwt/Permission/Public. The adapter looks up the guard by `id` from a
 * registry the bootstrap provides; metadata is forwarded as
 * `@SetMetadata(metadataKey, metadataValue)` calls before
 * `@UseGuards(...)`. This keeps the Route descriptor framework-free
 * while letting Nest-side guards (RateLimitGuard, InternalAuthGuard,
 * AllowUnverifiedEmail bypass, etc.) participate. Future Elysia/
 * Fastify adapters supply their own registry implementations.
 */
export interface GuardSpec {
  /** Stable id used by the adapter's guard registry (e.g. `'rate-limit'`,
   *  `'internal-auth'`, `'fit-profile'`, `'min-quality'`). */
  readonly id: string;
  /** Optional metadata payloads attached to the route via SetMetadata-
   *  like primitives. The adapter chooses which metadata key applies. */
  readonly metadata?: Record<string, unknown>;
}

/** HTTP status code override. By default the synthesizer picks 201 for
 *  POST and 200 for everything else. Routes that need a specific code
 *  (204 No Content, 202 Accepted, …) declare it here. */
export type StatusOverride = number;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** How the adapter parses the incoming body and shapes the outgoing
 *  response. Defaults to `'json'` when omitted.
 *
 *  - `json`: standard JSON request/response.
 *  - `sse`: Server-Sent Events stream (handler returns Observable).
 *  - `multipart`: multipart/form-data body parsing.
 *  - `stream`: raw text/octet streaming (Prometheus /metrics, etc.). For
 *    downloadable files prefer `route.binary` instead — it adds a media
 *    type + filename to the OpenAPI doc so Orval generates `Promise<Blob>`.
 *  - `redirect`: handler returns `withRedirect(url)`. Generator emits a
 *    302 response with `Location` header; SDK skips body parsing.
 */
export type RouteKind = 'json' | 'sse' | 'multipart' | 'stream' | 'redirect';

/**
 * Binary response declaration. Routes that stream a file (PDF/DOCX/PNG…)
 * declare the response media type + suggested filename here instead of
 * a Zod `response` schema. The swagger generator emits
 * `responses[200].content[mediaType] = { schema: { type: 'string', format: 'binary' } }`
 * and Orval generates `Promise<Blob>` for the operation.
 *
 * Mutually exclusive with `response` and `kind: 'sse' | 'redirect'`.
 */
export interface BinaryResponseSpec {
  readonly mediaType: string;
  readonly filename?: string;
}

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
 * `HttpCtx` plus the BC's use-case bundle (`TBundle`). The bundle is
 * resolved by the host adapter from DI (Nest today, future Elysia
 * tomorrow) and passed in at request time — handlers stay pure
 * functions, no closure required.
 */
export type RouteHandler<
  TBundle = unknown,
  TBody = unknown,
  TQuery = Record<string, string | string[] | undefined>,
  TParams = Record<string, string>,
> = (ctx: HttpCtx<TBody, TQuery, TParams>, bundle: TBundle) => Promise<HandlerResult>;

/** Per-route middleware — the escape hatch for the ~5% of routes that
 *  need behaviour the global pipeline doesn't cover (custom rate-limit
 *  configs, bespoke consent variants). Runs after global pipeline,
 *  before the handler. */
export type RouteMiddleware = (ctx: HttpCtx) => Promise<void>;

export interface Route<
  TBundle = unknown,
  TBody = unknown,
  TQuery = Record<string, string | string[] | undefined>,
  TParams = Record<string, string>,
> {
  readonly method: HttpMethod;
  readonly path: string;

  readonly auth: AuthSpec;
  readonly permission?: PermissionRequirement;

  /** Custom guards beyond auth/permission (rate-limit, throttling,
   *  bespoke business gates). Adapter resolves each `id` against its
   *  guard registry. */
  readonly guards?: readonly GuardSpec[];

  /** Override the HTTP success status code. */
  readonly statusCode?: StatusOverride;

  /** Static response headers. Adapter sets each header on the response.
   *  For dynamic per-request headers (e.g. `Content-Language` derived
   *  from `Accept-Language`), the handler returns
   *  `{ __headers: {...}, body: ... }` and the adapter unpacks. */
  readonly headers?: Readonly<Record<string, string>>;

  /** Body / query / params validation. Adapter runs Zod parse and
   *  populates `ctx.body | ctx.query | ctx.params` with the parsed
   *  output. When omitted, the raw shape passes through unchanged.
   *  The schemas are intentionally typed loosely (`ZodSchema<unknown>`)
   *  so route descriptors can plug any project-specific Zod schema in
   *  without re-stating its inferred output type — the handler then
   *  narrows via `ctx.body as XDto`. */
  readonly body?: ZodSchema<unknown>;
  readonly query?: ZodSchema<unknown>;
  readonly params?: ZodSchema<unknown>;

  /** Used by the SDK generator + OpenAPI doc. Optional — routes that
   *  return raw text/streams (Prometheus metrics, SSE) leave it off. */
  readonly response?: ZodSchema<unknown>;

  /** Binary file response (PDF/DOCX/PNG…). Mutually exclusive with
   *  `response`. Generator emits OpenAPI binary content type so Orval
   *  produces `Promise<Blob>`. */
  readonly binary?: BinaryResponseSpec;

  readonly openapi: OpenApiMeta;
  readonly sdk?: SdkMeta;

  readonly kind?: RouteKind;
  readonly skip?: readonly PipelineStageName[];
  readonly middleware?: readonly RouteMiddleware[];

  readonly handler: RouteHandler<TBundle, TBody, TQuery, TParams>;
}

/**
 * Sentinel a handler can return when it needs to override response
 * headers per-request (e.g. content-language derived from
 * `Accept-Language`). The adapter unpacks `{ headers, body }` and
 * applies headers + serializes `body` as the response. When the handler
 * returns anything else, the adapter treats the value as the body.
 */
export interface HandlerResponseWithHeaders<T = unknown> {
  readonly __dynamicHeaders: true;
  readonly headers: Record<string, string>;
  readonly body: T;
}

export function withHeaders<T>(
  headers: Record<string, string>,
  body: T,
): HandlerResponseWithHeaders<T> {
  return { __dynamicHeaders: true, headers, body };
}

export function isResponseWithHeaders(
  value: unknown,
): value is HandlerResponseWithHeaders<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __dynamicHeaders?: unknown }).__dynamicHeaders === true
  );
}

/**
 * Sentinel a handler can return to issue an HTTP redirect. The adapter
 * detects it and calls `res.redirect(status, url)` instead of
 * serializing a body. Status defaults to 302.
 */
export interface HandlerRedirect {
  readonly __redirect: true;
  readonly url: string;
  readonly status: number;
}

export function withRedirect(url: string, status = 302): HandlerRedirect {
  return { __redirect: true, url, status };
}

export function isRedirect(value: unknown): value is HandlerRedirect {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __redirect?: unknown }).__redirect === true
  );
}

/**
 * A `RouteGroup` ties a bundle of routes to the DI token that resolves
 * their dependency. The Nest adapter uses the token to inject the
 * bundle into each synthesized controller. Future framework adapters
 * resolve the token from their own DI graph (or skip it entirely if
 * they prefer manual wiring).
 */
export interface RouteGroup<TBundle> {
  readonly bundleToken: abstract new (...args: never[]) => TBundle;
  readonly routes: ReadonlyArray<Route<TBundle>>;
}

/** Helper to declare a route group with full type inference, so
 *  callsites read as `defineRouteGroup(BadgesUseCases, [...])`. */
export function defineRouteGroup<TBundle>(
  bundleToken: abstract new (...args: never[]) => TBundle,
  routes: ReadonlyArray<Route<TBundle>>,
): RouteGroup<TBundle> {
  return { bundleToken, routes };
}
