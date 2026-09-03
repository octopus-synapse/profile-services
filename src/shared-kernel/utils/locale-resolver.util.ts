/**
 * Locale Resolver Utility
 *
 * Resolves translated fields from JSON translations stored in DB.
 * Supports fallback chain: requested locale → 'en' → first available.
 *
 * Field-level resolvers: ./field-translation.helpers
 * Types: ./locale-resolver.types
 */

import { resolveFieldsForLocale } from './field-translation.helpers';
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type ResolvedSectionGroup,
  type ResolvedSectionType,
  type SectionDefinitionJson,
  type SectionGroupTranslationsJson,
  type SectionTypeTranslation,
  type TranslationsJson,
} from './locale-resolver.types';

export type {
  FieldDefinition,
  FieldTranslation,
  FieldTranslationsJson,
  Locale,
  ResolvedSectionType,
  SectionDefinitionJson,
  SectionTypeTranslation,
  SupportedLocale,
  TranslationsJson,
} from './locale-resolver.types';
export {
  DEFAULT_LOCALE,
  LOCALES,
  SUPPORTED_LOCALES,
} from './locale-resolver.types';

/** Validates if a string is *exactly* a canonical locale tag. Case-sensitive
 *  on purpose — this is the "is it already canonical?" predicate. Use
 *  {@link normalizeLocale} to accept the wild forms. */
export function isSupportedLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}

/**
 * Every spelling of a locale we accept, mapped to its canonical tag.
 *
 * Built from `LOCALES` rather than written out, so adding a locale to
 * `@packages/i18n` extends this table for free. Two spellings are accepted
 * per locale: the full tag lowercased (`pt-br`) and the bare primary subtag
 * (`pt`). Primary-subtag entries are first-wins over `LOCALES` order, which
 * is what makes `pt` mean `pt-BR` and not some future `pt-PT`.
 */
const LOCALE_ALIASES: ReadonlyMap<string, Locale> = (() => {
  const table = new Map<string, Locale>();
  for (const locale of LOCALES) {
    const lower = locale.toLowerCase();
    table.set(lower, locale);
    const primary = lower.split('-')[0];
    if (primary && !table.has(primary)) table.set(primary, locale);
  }
  return table;
})();

/**
 * Canonicalize any locale-ish string to a `Locale`, or `null` when it names
 * no locale we serve.
 *
 * ADR-003 §11 makes `pt-BR` / `en` from `@packages/i18n` the single
 * vocabulary, but the wild forms are everywhere and outlive the migration:
 * the `Resume.language` column shipped its default as `'pt-br'`, HTTP clients
 * send `pt_BR` and `PT-br`, and `TranslationLlmPort` speaks `'pt'`. All of
 * those denote the same locale, and every one of them used to fall through to
 * English — silently, because the old `parseLocale` only trimmed.
 *
 * Accepts: any case, `_` or `-` as the separator, with or without the region
 * subtag, and an unserved region on a served language (`en-US` → `en`,
 * `pt-PT` → `pt-BR`) — the same exact-or-prefix rule `negotiateLocale` already
 * applies to `Accept-Language`, so the query param and the header can no
 * longer disagree about the same string. Rejects (returns `null`) anything
 * else, so a caller that needs to tell "absent" from "unrecognised" can.
 */
export function normalizeLocale(raw: string | null | undefined): Locale | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/_/g, '-');
  if (!key) return null;

  const exact = LOCALE_ALIASES.get(key);
  if (exact) return exact;

  // A served language with a region we do not serve still names a language we
  // can answer in; only an unknown language is a miss.
  const primary = key.split('-')[0];
  return primary ? (LOCALE_ALIASES.get(primary) ?? null) : null;
}

/**
 * Locale for a request, defaulting to `DEFAULT_LOCALE`.
 *
 * Lenient by construction — this reads `?locale=` and other free-text inputs,
 * where rejecting `pt-br` outright would be hostile. Routes that want the
 * strict form validate with `LocaleSchema` at the Zod boundary instead.
 */
export function parseLocale(locale: string | undefined): Locale {
  return normalizeLocale(locale) ?? DEFAULT_LOCALE;
}

/**
 * Resolve translation for a specific locale with fallback chain:
 * 1. Requested locale, 2. English ('en'), 3. First available, 4. Empty.
 */
/**
 * Resolve a section type's translation for a locale. No fallback: a section
 * type served without a translation for the requested locale is a BUG (drift
 * between the catalog and prisma/seeds/shared/section-type-translations.ts), so this
 * throws instead of returning empty strings or the English copy. The seed-time
 * validation and the i18n parity specs are the first lines of defence.
 */
export function resolveTranslation(
  translations: TranslationsJson | null | undefined,
  locale: Locale,
  sectionKeyHint = '(unknown section)',
): SectionTypeTranslation {
  if (!translations || typeof translations !== 'object') {
    throw new Error(`[i18n] Section type '${sectionKeyHint}' has no translations. No fallback.`);
  }
  const entry = translations[locale];
  if (!entry) {
    throw new Error(
      `[i18n] Section type '${sectionKeyHint}' has no translation for locale '${locale}'. No fallback.`,
    );
  }
  return entry;
}

/**
 * Non-throwing counterpart of {@link resolveTranslation} for DISPLAY-TITLE
 * lookups while RENDERING a resume (the catalog title map + per-section
 * heading). Returns `null` when the locale entry is missing so the caller
 * can fall back to the base `title` column instead of 500-ing the whole
 * render. A single drifted or custom (non-system) section type must not
 * take down a resume preview that may not even use it.
 *
 * The strict {@link resolveTranslation} / {@link resolveSectionTypeForLocale}
 * stay in force on the catalog/editor paths, where a missing translation is
 * a real catalog-drift bug that must surface loudly.
 */
export function tryResolveTranslation(
  translations: TranslationsJson | null | undefined,
  locale: Locale,
): SectionTypeTranslation | null {
  if (!translations || typeof translations !== 'object') return null;
  return translations[locale] ?? null;
}

/** Resolve a SectionType from DB to frontend-ready format. */
export function resolveSectionTypeForLocale(
  sectionType: {
    id: string;
    key: string;
    slug: string;
    semanticKind: string;
    version: number;
    groupKey: string | null;
    title: string;
    description: string | null;
    iconType: string;
    icon: string;
    isActive: boolean;
    isSystem: boolean;
    isRepeatable: boolean;
    minItems: number | null;
    maxItems: number | null;
    definition: unknown;
    uiSchema: unknown;
    renderHints: unknown;
    fieldStyles: unknown;
    translations: unknown;
  },
  locale: Locale,
): ResolvedSectionType {
  const translations = sectionType.translations as TranslationsJson | null;
  const resolved = resolveTranslation(translations, locale, sectionType.key);

  // No fallback: every user-facing string comes straight from the translation.
  // A missing/empty one is a BUG caught by the i18n parity specs + seed
  // validation, not patched over with English or a hardcoded default.
  const requireField = (value: string | undefined, field: string): string => {
    if (!value || value.trim().length === 0) {
      throw new Error(
        `[i18n] Section type '${sectionType.key}' is missing '${field}' for locale '${locale}'. No fallback.`,
      );
    }
    return value;
  };

  return {
    id: sectionType.id,
    key: sectionType.key,
    slug: sectionType.slug,
    semanticKind: sectionType.semanticKind,
    version: sectionType.version,
    groupKey: sectionType.groupKey,
    title: requireField(resolved.title, 'title'),
    description: requireField(resolved.description, 'description'),
    label: requireField(resolved.label, 'label'),
    noDataLabel: requireField(resolved.noDataLabel, 'noDataLabel'),
    placeholder: requireField(resolved.placeholder, 'placeholder'),
    addLabel: requireField(resolved.addLabel, 'addLabel'),
    iconType: sectionType.iconType,
    icon: sectionType.icon,
    isActive: sectionType.isActive,
    isSystem: sectionType.isSystem,
    isRepeatable: sectionType.isRepeatable,
    minItems: sectionType.minItems,
    maxItems: sectionType.maxItems,
    definition: resolveDefinitionFieldsForLocale(sectionType.definition, locale),
    uiSchema: sectionType.uiSchema,
    renderHints: sectionType.renderHints,
    fieldStyles: sectionType.fieldStyles,
  };
}

/**
 * Resolve a SectionGroup (supersection) from DB to a locale. Strict, like
 * {@link resolveSectionTypeForLocale}: a group without a title for the requested
 * locale is catalog drift and throws (seed validation is the first defence).
 */
export function resolveSectionGroupForLocale(
  group: {
    key: string;
    iconType: string;
    icon: string;
    order: number;
    translations: unknown;
  },
  locale: Locale,
): ResolvedSectionGroup {
  const translations = group.translations as SectionGroupTranslationsJson | null;
  const entry = translations?.[locale];
  if (!entry?.title?.trim()) {
    throw new Error(
      `[i18n] Section group '${group.key}' has no title for locale '${locale}'. No fallback.`,
    );
  }
  return {
    key: group.key,
    title: entry.title,
    description: entry.description?.trim() ? entry.description : null,
    iconType: group.iconType,
    icon: group.icon,
    order: group.order,
  };
}

/** Resolve entire definition JSON for locale. */
export function resolveDefinitionFieldsForLocale(definition: unknown, locale: Locale): unknown {
  if (!definition || typeof definition !== 'object') return definition;
  const def = definition as SectionDefinitionJson;
  if (!def.fields) return definition;
  return { ...def, fields: resolveFieldsForLocale(def.fields, locale) };
}
