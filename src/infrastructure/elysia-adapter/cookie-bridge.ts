/**
 * Cookie bridge — translates the framework-free cookie jar staged on
 * `HttpCtx.state` into `Set-Cookie` header strings the Elysia adapter
 * appends to the response.
 *
 * Mirrors the Express-style behaviour of the Nest adapter so handlers
 * don't change: `stageSetCookie(ctx, 'access_token', token, opts)` →
 * `Set-Cookie: access_token=...; HttpOnly; Secure; Path=/; Max-Age=900`.
 *
 * `clears` produce `Set-Cookie: name=; Max-Age=0` entries.
 */

import type { HttpCtx } from '@/shared-kernel/http/context';
import {
  COOKIE_JAR_KEY,
  type PendingCookieJar,
  type PendingCookieOptions,
} from '@/shared-kernel/http/cookie-jar';

function serializeOptions(opts: PendingCookieOptions): string {
  const parts: string[] = [];
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) {
    const v = opts.sameSite[0]?.toUpperCase() + opts.sameSite.slice(1);
    parts.push(`SameSite=${v}`);
  }
  return parts.length ? `; ${parts.join('; ')}` : '';
}

export function drainCookieJar(ctx: HttpCtx): string[] {
  const jar = (ctx.state as Record<string, unknown>)[COOKIE_JAR_KEY] as
    | PendingCookieJar
    | undefined;
  if (!jar) return [];
  const out: string[] = [];
  for (const { name, value, options } of jar.sets) {
    out.push(`${name}=${encodeURIComponent(value)}${serializeOptions(options)}`);
  }
  for (const { name, options } of jar.clears) {
    out.push(
      `${name}=${serializeOptions({ ...options, maxAge: 0 })}`.replace(/^;\s*/, '') ||
        `${name}=; Max-Age=0`,
    );
  }
  return out;
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const trimmed = pair.trim();
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      try {
        out[trimmed.slice(0, eq)] = decodeURIComponent(trimmed.slice(eq + 1));
      } catch {
        out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
      }
    }
  }
  return out;
}
