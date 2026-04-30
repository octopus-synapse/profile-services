/**
 * Cookie-jar staging area attached to `HttpCtx.state`.
 *
 * Route handlers don't get a `CookieWriter` parameter — they stage
 * cookie ops on `ctx.state.__cookieJar` and the host adapter (Nest
 * today) flushes them onto the response after the handler returns.
 * Keeping the jar on `ctx.state` keeps the read-only `cookies` field
 * on `HttpCtx` intact and lets future Elysia/Fastify adapters drain
 * the same shape with their own cookie APIs.
 */

import type { HttpCtx } from './context';

export interface PendingCookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  domain?: string;
  /** Cookie lifetime in milliseconds. Adapter translates this to the
   *  host's expected shape (Express uses `expires`, others may use
   *  `Max-Age`). */
  maxAge?: number;
}

export interface PendingCookieJar {
  readonly sets: Array<{ name: string; value: string; options: PendingCookieOptions }>;
  readonly clears: Array<{ name: string; options: PendingCookieOptions }>;
}

export const COOKIE_JAR_KEY = '__cookieJar';

/** Lazily install a cookie jar on `ctx.state` and return it. Callers
 *  push onto the returned object's `sets`/`clears`. */
export function getOrInstallCookieJar(ctx: HttpCtx): PendingCookieJar {
  const state = ctx.state as Record<string, unknown>;
  const existing = state[COOKIE_JAR_KEY] as PendingCookieJar | undefined;
  if (existing) return existing;
  const jar: PendingCookieJar = { sets: [], clears: [] };
  state[COOKIE_JAR_KEY] = jar;
  return jar;
}

/** Convenience: stage a single cookie write. */
export function stageSetCookie(
  ctx: HttpCtx,
  name: string,
  value: string,
  options: PendingCookieOptions = {},
): void {
  getOrInstallCookieJar(ctx).sets.push({ name, value, options });
}

/** Convenience: stage a single cookie clear. */
export function stageClearCookie(
  ctx: HttpCtx,
  name: string,
  options: PendingCookieOptions = {},
): void {
  getOrInstallCookieJar(ctx).clears.push({ name, options });
}
