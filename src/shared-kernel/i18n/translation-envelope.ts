/**
 * The derived-locale copy of a piece of prose, as stored on
 * `SectionItem.translations[locale]` and `Resume.translations[locale]`.
 *
 * `sourceHash` is the hash of the canonical subset the copy was made from.
 * When the canonical text changes the hash stops matching and the copy is
 * stale — a fact on the row, not a guess. `origin` says who wrote the copy:
 * the worker ("derived"), the person in the other language ("manual"), or the
 * person after refusing the machine's rewrite ("diverged"). The worker never
 * overwrites the last two.
 */

import { createHash } from 'node:crypto';
import type { Locale } from '@packages/i18n';

export type TranslationOrigin = 'derived' | 'manual' | 'diverged';

export interface TranslationEnvelope<TData = Record<string, unknown>> {
  readonly data: TData;
  readonly sourceHash: string;
  readonly translatedAt: string;
  readonly origin: TranslationOrigin;
}

export type TranslationsByLocale<TData = Record<string, unknown>> = Partial<
  Record<Locale, TranslationEnvelope<TData>>
>;

/** Stable hash of a JSON subset — key order does not matter. */
export function hashSource(subset: Record<string, unknown>): string {
  const canonical = JSON.stringify(sortKeys(subset));
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/** Reads the envelope for `locale` off a raw `translations` JSON column. */
export function envelopeFor<TData = Record<string, unknown>>(
  translations: unknown,
  locale: Locale,
): TranslationEnvelope<TData> | null {
  if (!translations || typeof translations !== 'object') return null;
  const entry = (translations as Record<string, unknown>)[locale];
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Partial<TranslationEnvelope<TData>>;
  if (!e.data || typeof e.sourceHash !== 'string' || typeof e.origin !== 'string') return null;
  return e as TranslationEnvelope<TData>;
}

/** The state a reader shows for a derived locale. */
export type DerivedState = 'current' | 'stale' | 'missing';

export function derivedState(
  envelope: TranslationEnvelope | null,
  currentHash: string,
): DerivedState {
  if (!envelope) return 'missing';
  return envelope.sourceHash === currentHash ? 'current' : 'stale';
}

/** The one other locale a résumé can be derived into. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'pt-BR' : 'en';
}

/** What a locale-resolved item carries besides its content (ADR-0011 readers). */
export interface ResolvedItemMeta {
  readonly contentLocale: Locale;
  readonly origin: TranslationOrigin | 'canonical';
  readonly translationState: DerivedState | 'canonical';
}

/**
 * Resolve an item's content for `locale`. The canonical locale returns the
 * content as is. For the other locale the envelope's `data` is merged OVER the
 * canonical content — non-translatable fields (dates, URLs, enums) keep their
 * canonical values, prose is replaced — and the meta says how fresh it is.
 * A missing envelope falls back to the canonical text, flagged `missing`, so
 * a reader never sees a hole (ADR-003 §14).
 */
export function resolveItemForLocale(
  content: Record<string, unknown>,
  translations: unknown,
  canonicalLocale: Locale,
  locale: Locale,
  sourceHashOfCanonical: string | null,
): { content: Record<string, unknown>; meta: ResolvedItemMeta } {
  if (locale === canonicalLocale) {
    return {
      content,
      meta: { contentLocale: locale, origin: 'canonical', translationState: 'canonical' },
    };
  }
  const envelope = envelopeFor(translations, locale);
  if (!envelope) {
    return {
      content,
      meta: { contentLocale: canonicalLocale, origin: 'canonical', translationState: 'missing' },
    };
  }
  const state =
    envelope.origin === 'derived' && sourceHashOfCanonical !== null
      ? derivedState(envelope, sourceHashOfCanonical)
      : 'current';
  return {
    content: { ...content, ...envelope.data },
    meta: { contentLocale: locale, origin: envelope.origin, translationState: state },
  };
}

/**
 * The canonical values of the keys an envelope translated — what its hash
 * was taken over. The reader does not know the field policy, so staleness is
 * judged by the worker's own hash against the subset the envelope names.
 */
export function subsetNamedBy(
  content: Record<string, unknown>,
  translations: unknown,
  locale: Locale,
): Record<string, unknown> | null {
  const entry = envelopeFor(translations, locale);
  if (!entry?.data) return null;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(entry.data)) {
    const value = content[key];
    if (typeof value === 'string' && value.trim()) out[key] = value;
    else if (Array.isArray(value)) out[key] = value.filter((v) => typeof v === 'string');
  }
  return out;
}

/**
 * `resolveItemForLocale` for a stored row: the envelope's own hash decides
 * freshness. Every reader of item content — sections API, DSL render, public
 * share payload — goes through here so they cannot disagree (ADR-003 §12).
 */
export function resolveStoredItem(
  content: Record<string, unknown>,
  translations: unknown,
  canonicalLocale: Locale,
  locale: Locale,
): { content: Record<string, unknown>; meta: ResolvedItemMeta } {
  const subset = subsetNamedBy(content, translations, locale);
  return resolveItemForLocale(
    content,
    translations,
    canonicalLocale,
    locale,
    subset ? hashSource(subset) : null,
  );
}

export interface ResumeProse {
  readonly summary: string | null;
  readonly headline: string | null;
  readonly jobTitle: string | null;
}

/**
 * Résumé-level prose (summary / headline / jobTitle) for `locale`: the
 * canonical locale returns the columns; the other locale merges the résumé
 * envelope over them, falling back to the canonical text per field so a
 * reader never sees a hole.
 */
export function resolveResumeProse(
  prose: ResumeProse,
  translations: unknown,
  canonicalLocale: Locale,
  locale: Locale,
): ResumeProse {
  if (locale === canonicalLocale) return prose;
  const envelope = envelopeFor<Partial<Record<keyof ResumeProse, unknown>>>(translations, locale);
  if (!envelope) return prose;
  const pickText = (key: keyof ResumeProse): string | null => {
    const value = envelope.data[key];
    return typeof value === 'string' && value.trim() ? value : prose[key];
  };
  return {
    summary: pickText('summary'),
    headline: pickText('headline'),
    jobTitle: pickText('jobTitle'),
  };
}
