import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { LoggerPort } from '@/shared-kernel';

const CTX = 'CookieParserMiddleware';

/**
 * Lightweight cookie parser middleware.
 * Replaces the `cookie-parser` npm package — parses the Cookie header
 * into req.cookies so the rest of the app can read cookies as usual.
 */
@Injectable()
export class CookieParserMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerPort) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.cookies === undefined) {
      const result = parseCookieHeader(req.headers.cookie);
      req.cookies = result.cookies;
      if (result.malformed.length > 0) {
        this.logger.warn(
          `Cookie header had ${result.malformed.length} malformed value(s): ${result.malformed.join(', ')}`,
          CTX,
        );
      }
    }
    next();
  }
}

export interface ParsedCookies {
  cookies: Record<string, string>;
  /** Keys whose value failed `decodeURIComponent` and fell back to the raw form. */
  malformed: string[];
}

export function parseCookieHeader(header: string | undefined): ParsedCookies {
  if (!header) return { cookies: {}, malformed: [] };

  const cookies: Record<string, string> = {};
  const malformed: string[] = [];
  for (const pair of header.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    if (!key) continue;
    const raw = pair.slice(eqIdx + 1).trim();
    const decoded = tryDecode(raw);
    if (decoded.ok) {
      cookies[key] = decoded.value;
    } else {
      cookies[key] = raw;
      malformed.push(`${key}(${decoded.reason})`);
    }
  }
  return { cookies, malformed };
}

/** Wraps `decodeURIComponent` in a result type so the callsite is a switch
 *  on the outcome instead of a try/catch that has to choose between
 *  rethrowing (would crash on every malformed cookie) and silently
 *  swallowing (loses telemetry). `decodeURIComponent` only throws
 *  `URIError`; anything else is a real bug and propagates. */
function tryDecode(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
  try {
    return { ok: true, value: decodeURIComponent(raw) };
  } catch (err) {
    if (!(err instanceof URIError)) throw err;
    return { ok: false, reason: err.message };
  }
}
