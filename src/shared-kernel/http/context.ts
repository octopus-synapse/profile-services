/**
 * Framework-neutral HTTP context exposed to route handlers and pipeline
 * stages. Lives in `shared-kernel` so domain-side code never imports
 * `@nestjs/common` (Request/Response) — adapters synthesize this shape
 * from whatever their host framework provides.
 *
 * Designed to carry just enough to express the surface of every route
 * we have today: typed user payload, parsed body/query/params (post-
 * validation), the original method/path, request headers, plus mutable
 * `state` for pipeline stages to communicate without leaking
 * framework-specific globals.
 */

export interface UserPayload {
  readonly userId: string;
  readonly email: string;
  readonly emailVerified?: boolean;
}

export interface HttpCtx<
  TBody = unknown,
  TQuery = Record<string, string | string[] | undefined>,
  TParams = Record<string, string>,
> {
  readonly method: string;
  readonly path: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly cookies: Record<string, string | undefined>;
  /** Client IP address — derived from `X-Forwarded-For` if present, else
   *  the socket remote address. */
  readonly ip: string | undefined;
  /** Convenience accessor for `headers['user-agent']`. */
  readonly userAgent: string | undefined;
  readonly body: TBody;
  readonly query: TQuery;
  readonly params: TParams;
  /** Populated by the auth pipeline stage when the route requires JWT. */
  user: UserPayload | null;
  /** Mutable scratchpad for pipeline stages — keyed by stage name. */
  readonly state: Record<string, unknown>;
}

/** What the handler returns. Pipeline `responseWrapper` stage will
 *  envelope plain values into `{ success, data }`. SSE / stream / multipart
 *  routes opt out via `Route.skip`. */
export type HandlerResult = unknown;
