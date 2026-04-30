/**
 * Bridges the framework-free `HttpCtx` to the auth domain's
 * `CookieReader` / `CookieWriter` ports the session use-cases consume.
 *
 * Reads pull straight from `ctx.cookies` (already decoded by upstream
 * cookie-parser middleware). Writes stage cookie ops on
 * `ctx.state.__cookieJar` via `shared-kernel/http/cookie-jar`; the
 * synthesizer flushes the jar onto the host response after the route
 * handler returns.
 *
 * Pure functions — no Nest/Express imports, safe to call from
 * framework-neutral route descriptors.
 */

import type { HttpCtx } from '@/shared-kernel/http/context';
import { stageClearCookie, stageSetCookie } from '@/shared-kernel/http/cookie-jar';
import type {
  CookieReader,
  CookieWriter,
  SessionCookieOptions,
} from '../../domain/ports/session-storage.port';

export function ctxCookieReader(ctx: HttpCtx): CookieReader {
  return { getCookie: (name: string) => ctx.cookies[name] };
}

export function ctxCookieWriter(ctx: HttpCtx): CookieWriter {
  return {
    setCookie: (name: string, value: string, options: SessionCookieOptions) => {
      stageSetCookie(ctx, name, value, options);
    },
    clearCookie: (name: string, options: Partial<SessionCookieOptions>) => {
      stageClearCookie(ctx, name, options);
    },
  };
}
