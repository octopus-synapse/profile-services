import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Lightweight cookie parser middleware.
 * Replaces the `cookie-parser` npm package — parses the Cookie header
 * into req.cookies so the rest of the app can read cookies as usual.
 */
@Injectable()
export class CookieParserMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    req.cookies ??= parseCookieHeader(req.headers.cookie);
    next();
  }
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};

  const cookies: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    if (!key) continue;
    const raw = pair.slice(eqIdx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(raw);
    } catch {
      cookies[key] = raw;
    }
  }
  return cookies;
}
