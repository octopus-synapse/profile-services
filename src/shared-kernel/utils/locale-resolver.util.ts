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
  type ResolvedSectionType,
  type SectionDefinitionJson,
  type SectionTypeTranslation,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TranslationsJson,
} from './locale-resolver.types';

export type {
  FieldDefinition,
  FieldTranslation,
  FieldTranslationsJson,
  ResolvedSectionType,
  SectionDefinitionJson,
  SectionTypeTranslation,
  SupportedLocale,
  TranslationsJson,
} from './locale-resolver.types';
export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from './locale-resolver.types';

/** Validates if a string is a supported locale. */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/** Parse and validate locale from request, defaulting to 'en'. */
export function parseLocale(locale: string | undefined): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = locale.trim();
  return isSupportedLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

/**
 * Resolve translation for a specific locale with fallback chain:
 * 1. Requested locale, 2. English ('en'), 3. First available, 4. Empty.
 */
export function resolveTranslation(
  translations: TranslationsJson | null | undefined,
  locale: SupportedLocale,
): SectionTypeTranslation {
  const empty: SectionTypeTranslation = {
    title: '',
    description: '',
    label: '',
    noDataLabel: '',
    placeholder: '',
    addLabel: '',
  };
  if (!translations || typeof translations !== 'object') return empty;
  if (translations[locale]) return translations[locale];
  if (translations.en) return translations.en;
  const firstKey = Object.keys(translations)[0];
  if (firstKey && translations[firstKey]) return translations[firstKey];
  return empty;
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
  locale: SupportedLocale,
): ResolvedSectionType {
  const translations = sectionType.translations as TranslationsJson | null;
  const resolved = resolveTranslation(translations, locale);

  return {
    id: sectionType.id,
    key: sectionType.key,
    slug: sectionType.slug,
    semanticKind: sectionType.semanticKind,
    version: sectionType.version,
    title: resolved.title || sectionType.title,
    description: resolved.description || sectionType.description || '',
    label: resolved.label || sectionType.key,
    noDataLabel: resolved.noDataLabel || "I don't have items to add",
    placeholder: resolved.placeholder || 'Add items...',
    addLabel: resolved.addLabel || 'Add Item',
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
export function resolveDefinitionFieldsForLocale(
  definition: unknown,
  locale: SupportedLocale,
): unknown {
  if (!definition || typeof definition !== 'object') return definition;
  const def = definition as SectionDefinitionJson;
  if (!def.fields) return definition;
  return { ...def, fields: resolveFieldsForLocale(def.fields, locale) };
}
