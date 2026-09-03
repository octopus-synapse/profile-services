import type { Locale } from '@packages/i18n';
import { negotiateLocale } from '@/bounded-contexts/platform/i18n/application/locale-negotiator';
import { normalizeLocale } from '@/shared-kernel/utils/locale-resolver.util';

/**
 * The locale the person actually did onboarding in.
 *
 * ADR-003 §10 — the résumé's canonical language must be the one it was
 * written in, and until now nothing recorded it: every résumé was born with
 * the column default, so an English onboarding produced a résumé labelled
 * Portuguese. The completing request is the cheapest honest signal we have
 * (no LLM, no extra round trip): the explicit `?locale=` the client already
 * sends on every other onboarding route, else the negotiated
 * `Accept-Language`.
 *
 * Returns `null` when neither is present or recognisable, which leaves the
 * column default standing rather than asserting a language we are guessing
 * at. Detecting the language from the prose itself (`detectLanguage` on the
 * translation port) is the stronger signal and is the ADR's own open item.
 */
export function resolveAuthoredLocale(ctx: {
  query: unknown;
  headers: Record<string, string | string[] | undefined>;
}): Locale | null {
  const explicit = normalizeLocale((ctx.query as { locale?: string } | undefined)?.locale);
  if (explicit) return explicit;

  const header = ctx.headers['accept-language'];
  const negotiated = negotiateLocale(Array.isArray(header) ? header[0] : header);
  return negotiated.matched ? negotiated.locale : null;
}
