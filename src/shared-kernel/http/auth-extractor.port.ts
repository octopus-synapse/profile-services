/**
 * Auth + permission ports — framework-free contracts that the route
 * adapter / pipeline use to authenticate requests. The Nest adapter
 * implements them on top of `JwtAuthGuard` + `PermissionGuard`; future
 * Elysia/Fastify adapters drop in different impls without touching
 * route descriptors.
 *
 * `AuthExtractorPort` is intentionally minimal: given the raw HTTP
 * primitives an adapter knows about (headers + cookies), return the
 * `UserPayload` if a valid token is present. It does NOT decide
 * whether a route is allowed — that's `Route.auth.kind` ('jwt' rejects
 * a null result, 'optional' tolerates it, 'public' skips extraction).
 */

import type { Permission } from '../authorization';
import type { UserPayload } from './context';

export interface RawAuthRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly cookies?: Record<string, string | undefined>;
}

export abstract class AuthExtractorPort {
  /**
   * Resolves the bearer token / session cookie into a `UserPayload`.
   * Returns `null` when no credentials are present. Throws when
   * credentials are present but invalid (so the pipeline can map the
   * error to 401 via the existing `mapDomainErrorToHttp` flow).
   */
  abstract extract(req: RawAuthRequest): Promise<UserPayload | null>;
}

export abstract class PermissionCheckerPort {
  /**
   * Returns `true` when the user satisfies the permission requirement.
   * Adapters delegate to the existing `permission-resolver` —
   * implementation can stay shared since it's already metadata-driven.
   */
  abstract check(user: UserPayload, permission: Permission): Promise<boolean>;
}
