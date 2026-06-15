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
  type ResolvedSectionType,
  type SectionDefinitionJson,
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

/** Validates if a string is a supported locale. */
export function isSupportedLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}

/** Parse and validate locale from request, defaulting to 'en'. */
export function parseLocale(locale: string | undefined): Locale {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = locale.trim();
  return isSupportedLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

/**
 * Resolve translation for a specific locale with fallback chain:
 * 1. Requested locale, 2. English ('en'), 3. First available, 4. Empty.
 */
/**
 * Resolve a section type's translation for a locale. No fallback: a section
 * type served without a translation for the requested locale is a BUG (drift
 * between the catalog and prisma/seeds/section-type-translations.ts), so this
 * throws instead of returning empty strings or the English copy. The seed-time
 * validation and the i18n parity specs are the first lines of defence.
 */
export function resolveTranslation(
  translations: TranslationsJson | null | undefined,
  locale: Locale,
  sectionKeyHint = '(unknown section)',
): SectionTypeTranslation {
  if (!translations || typeof translations !== 'object') {
    throw new Error(
      `[i18n] Section type '${sectionKeyHint}' has no translations. No fallback.`,
    );
  }
  const entry = translations[locale];
  if (!entry) {
    throw new Error(
      `[i18n] Section type '${sectionKeyHint}' has no translation for locale '${locale}'. No fallback.`,
    );
  }
  return entry;
}

/** Resolve a SectionType from DB to frontend-ready format. */
export function resolveSectionTypeForLocale(
  sectionType: {
    id: string;
    key: string;
    slug: string;
    semanticKind: string;
    version: number;
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

/** Resolve entire definition JSON for locale. */
export function resolveDefinitionFieldsForLocale(definition: unknown, locale: Locale): unknown {
  if (!definition || typeof definition !== 'object') return definition;
  const def = definition as SectionDefinitionJson;
  if (!def.fields) return definition;
  return { ...def, fields: resolveFieldsForLocale(def.fields, locale) };
}
