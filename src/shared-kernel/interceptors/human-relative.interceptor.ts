/**
 * Human-relative date enrichment interceptor
 *
 * Walks any JSON response and, for every property whose key matches the
 * pattern `<name>At` (createdAt, updatedAt, occurredAt, expiresAt, etc.)
 * and whose value parses as an ISO date string, adds a sibling
 * `<name>AtRelative` field with a humanized "2h ago" / "in 5d" string.
 *
 * Goal: kill the dozens of `timeAgo()` helpers duplicated across the
 * frontend. UI just renders `{x.createdAtRelative}` and never imports a
 * date library.
 *
 * Reads the user's locale from the `Accept-Language` header (falls back
 * to pt-BR), which is what we already do for content i18n.
 */

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const ISO_DATE_RX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

const RELATIVE_KEY_SUFFIX = 'Relative';
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Locale = 'pt-BR' | 'en';

function pickLocale(req: Request): Locale {
  const raw = (req.headers['accept-language'] as string | undefined) ?? '';
  return raw.toLowerCase().startsWith('en') ? 'en' : 'pt-BR';
}

function humanize(date: Date, now: number, locale: Locale): string {
  const diff = date.getTime() - now;
  const past = diff < 0;
  const abs = Math.abs(diff);

  const unit = abs >= DAY ? 'd' : abs >= HOUR ? 'h' : abs >= MINUTE ? 'm' : 's';
  const value =
    unit === 'd'
      ? Math.floor(abs / DAY)
      : unit === 'h'
        ? Math.floor(abs / HOUR)
        : unit === 'm'
          ? Math.floor(abs / MINUTE)
          : Math.floor(abs / SECOND);

  if (locale === 'en') {
    if (value === 0) return past ? 'just now' : 'in a moment';
    return past ? `${value}${unit} ago` : `in ${value}${unit}`;
  }
  if (value === 0) return past ? 'agora' : 'em instantes';
  // PT-BR: Portuguese readers get the same compact 2h/3d notation but with
  // 'há' / 'em' prefix so it scans naturally without extra glue text.
  return past ? `há ${value}${unit}` : `em ${value}${unit}`;
}

function enrich(value: unknown, now: number, locale: Locale, depth = 0): unknown {
  // Guardrails: cap recursion depth to avoid pathological objects, never
  // mutate strings/numbers/Date instances directly.
  if (depth > 8 || value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = enrich(value[i], now, locale, depth + 1);
    }
    return value;
  }

  if (typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const v = obj[key];

    if (typeof v === 'string' && ISO_DATE_RX.test(v) && key.endsWith('At')) {
      const relativeKey = `${key}${RELATIVE_KEY_SUFFIX}`;
      if (obj[relativeKey] === undefined) {
        const parsed = new Date(v);
        if (!Number.isNaN(parsed.getTime())) {
          obj[relativeKey] = humanize(parsed, now, locale);
        }
      }
      continue;
    }

    if (v && typeof v === 'object') {
      enrich(v, now, locale, depth + 1);
    }
  }

  return obj;
}

@Injectable()
export class HumanRelativeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request>();
    const locale = pickLocale(req);

    return next.handle().pipe(
      map((data) => {
        if (!data || typeof data !== 'object') return data;
        return enrich(data, Date.now(), locale);
      }),
    );
  }
}
