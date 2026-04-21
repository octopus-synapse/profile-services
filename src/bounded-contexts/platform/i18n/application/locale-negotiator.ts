/**
 * Locale Negotiator
 *
 * Parses `Accept-Language` according to RFC 7231 (quality ordering) and
 * picks the best match from SUPPORTED_LOCALES. Unsupported → DEFAULT_LOCALE
 * with the understanding that the caller will emit `Content-Language: en`.
 *
 * Why not a full-blown BCP-47 matcher: we only support two locales, both
 * with explicit region tags. A prefix-match on the primary language ('pt',
 * 'en') is enough and keeps zero dependencies.
 */

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '../domain/translation.port';

interface ParsedLanguage {
  readonly tag: string;
  readonly quality: number;
}

function parseAcceptLanguage(header: string | undefined): ParsedLanguage[] {
  if (!header) return [];
  return header
    .split(',')
    .map((raw) => {
      const [tag, ...params] = raw
        .trim()
        .split(';')
        .map((s) => s.trim());
      let quality = 1;
      for (const param of params) {
        const match = param.match(/^q=(\d*\.?\d+)$/);
        if (match) {
          const parsed = Number(match[1]);
          if (!Number.isNaN(parsed)) quality = parsed;
        }
      }
      return { tag: tag.toLowerCase(), quality };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);
}

function matches(candidate: string, supported: SupportedLocale): boolean {
  const lowerSupported = supported.toLowerCase();
  if (candidate === lowerSupported) return true;
  const prefix = lowerSupported.split('-')[0];
  return candidate === prefix || candidate.startsWith(`${prefix}-`);
}

export interface NegotiationResult {
  readonly locale: SupportedLocale;
  /** True when the caller's preferred language was honoured (exact or prefix match). */
  readonly matched: boolean;
}

export function negotiateLocale(acceptLanguage: string | undefined): NegotiationResult {
  const parsed = parseAcceptLanguage(acceptLanguage);
  for (const entry of parsed) {
    for (const supported of SUPPORTED_LOCALES) {
      if (matches(entry.tag, supported)) {
        return { locale: supported, matched: true };
      }
    }
  }
  return { locale: DEFAULT_LOCALE, matched: false };
}
