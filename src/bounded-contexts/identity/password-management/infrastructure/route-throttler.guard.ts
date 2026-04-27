/**
 * Route Throttler Guard
 *
 * Adapter that lets framework-free `Route` descriptors declare per-route
 * throttle limits the same way the legacy `@Throttle()` decorator did,
 * without forcing the synthesizer to know about `@nestjs/throttler`'s
 * multi-key metadata layout.
 *
 * The synthesizer sets a single metadata key (`ROUTE_THROTTLE_KEY`)
 * carrying the throttle config (`{ default: { limit, ttl } }`). This
 * guard expands that config into the named throttler tuples
 * (`THROTTLER_LIMIT + name`, `THROTTLER_TTL + name`, …) the upstream
 * `ThrottlerGuard` expects, then delegates to the standard NestJS
 * implementation.
 */
import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

export const ROUTE_THROTTLE_KEY = 'routeThrottleConfig';

// `@nestjs/throttler` does not re-export its internal metadata-key
// constants from its public entrypoint, so we mirror them here. The
// strings must stay in sync with `node_modules/@nestjs/throttler/dist/
// throttler.constants.{d.ts,js}` (verified Apr 2026).
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';
const THROTTLER_BLOCK_DURATION = 'THROTTLER:BLOCK_DURATION';

type ThrottleEntry = { limit: number; ttl: number; blockDuration?: number };
type RouteThrottleConfig = Record<string, ThrottleEntry>;

@Injectable()
export class RouteThrottlerGuard extends ThrottlerGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const reflector = (this as unknown as { reflector: Reflector }).reflector;
    const config = reflector.get<RouteThrottleConfig | undefined>(ROUTE_THROTTLE_KEY, handler);
    if (config) {
      // Mirror the multi-key layout `@Throttle({...})` uses internally so
      // the inherited `canActivate` finds the limits via `Reflector.get(...)`.
      for (const name of Object.keys(config)) {
        const entry = config[name];
        Reflect.defineMetadata(THROTTLER_TTL + name, entry.ttl, handler);
        Reflect.defineMetadata(THROTTLER_LIMIT + name, entry.limit, handler);
        if (entry.blockDuration !== undefined) {
          Reflect.defineMetadata(THROTTLER_BLOCK_DURATION + name, entry.blockDuration, handler);
        }
      }
    }
    return super.canActivate(context);
  }

  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';
    if (!isProduction) {
      const request = context.switchToHttp().getRequest<{ headers?: Record<string, unknown> }>();
      if (request?.headers?.['x-e2e-bypass-rate-limit'] === 'true') {
        return Promise.resolve(true);
      }
    }
    if (isTest && process.env.RATE_LIMIT_ENABLED !== 'true') {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }
}
