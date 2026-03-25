/**
 * Locale Resolver Utility
 *
 * Resolves translated fields from JSON translations stored in DB.
 * Supports fallback chain: requested locale → 'en' → first available.
 *
 * @module shared-kernel/utils/locale-resolver
 */

export type SupportedLocale = 'en' | 'pt-BR' | 'es';

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'pt-BR', 'es'];

/**
 * Translation structure stored in SectionType.translations JSON
 */
export interface SectionTypeTranslation {
  title: string;
  description: string;
  label: string;
  noDataLabel: string;
  placeholder: string;
  addLabel: string;
}

export type TranslationsJson = Record<string, SectionTypeTranslation>;

/**
 * Field-level translation structure
 * Stored in definition.fields[].meta.translations
 */
export interface FieldTranslation {
  label?: string;
  placeholder?: string;
  helpText?: string;
}

export type FieldTranslationsJson = Record<string, FieldTranslation>;

/**
 * Validates if a string is a supported locale
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Parse and validate locale from request, defaulting to 'en'
 */
export function parseLocale(locale: string | undefined): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = locale.trim();
  return isSupportedLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

/**
 * Resolve translation for a specific locale with fallback chain
 *
 * Fallback order:
 * 1. Requested locale
 * 2. English ('en')
 * 3. First available locale
 * 4. Empty translation object
 */
export function resolveTranslation(
  translations: TranslationsJson | null | undefined,
  locale: SupportedLocale,
): SectionTypeTranslation {
  const emptyTranslation: SectionTypeTranslation = {
    title: '',
    description: '',
    label: '',
    noDataLabel: '',
    placeholder: '',
    addLabel: '',
  };

  if (!translations || typeof translations !== 'object') {
    return emptyTranslation;
  }

  // Try requested locale
  if (translations[locale]) {
    return translations[locale];
  }

  // Fallback to English
  if (translations['en']) {
    return translations['en'];
  }

  // Fallback to first available
  const firstKey = Object.keys(translations)[0];
  if (firstKey && translations[firstKey]) {
    return translations[firstKey];
  }

  return emptyTranslation;
}

/**
 * Section type with translations resolved to single locale
 * This is what the frontend receives - no translations object, just resolved strings
 */
export interface ResolvedSectionType {
  id: string;
  key: string;
  slug: string;
  semanticKind: string;
  version: number;

  // Resolved from translations[locale]
  title: string;
  description: string;
  label: string;
  noDataLabel: string;
  placeholder: string;
  addLabel: string;

  // Icon
  iconType: string;
  icon: string;

  // Configuration
  isActive: boolean;
  isSystem: boolean;
  isRepeatable: boolean;
  minItems: number | null;
  maxItems: number | null;

  // Field definitions
  definition: unknown;
  uiSchema: unknown;

  // Style DSL
  renderHints: unknown;
  fieldStyles: unknown;
}

/**
 * Resolve a SectionType from DB to frontend-ready format
 */
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

    // Resolved translations (fallback to DB fields if translation missing)
    title: resolved.title || sectionType.title,
    description: resolved.description || sectionType.description || '',
    label: resolved.label || sectionType.key,
    noDataLabel: resolved.noDataLabel || "I don't have items to add",
    placeholder: resolved.placeholder || 'Add items...',
    addLabel: resolved.addLabel || 'Add Item',

    // Pass through
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

// ============================================================================
// Field-Level i18n Resolution
// ============================================================================

/**
 * Field definition with potential translations
 */
interface FieldDefinition {
  key?: string;
  type: string;
  meta?: {
    label?: string;
    placeholder?: string;
    helpText?: string;
    translations?: FieldTranslationsJson;
    [key: string]: unknown;
  };
  fields?: FieldDefinition[];
  items?: FieldDefinition;
}

/**
 * Definition structure with fields array
 */
interface SectionDefinitionJson {
  schemaVersion?: number;
  kind?: string;
  fields?: FieldDefinition[];
  [key: string]: unknown;
}

/**
 * Resolve field translation with fallback chain
 */
function resolveFieldTranslation(
  translations: FieldTranslationsJson | undefined,
  locale: SupportedLocale,
): FieldTranslation {
  if (!translations) return {};

  // Try requested locale
  if (translations[locale]) {
    return translations[locale];
  }

  // Fallback to English
  if (translations['en']) {
    return translations['en'];
  }

  // Fallback to first available
  const firstKey = Object.keys(translations)[0];
  if (firstKey && translations[firstKey]) {
    return translations[firstKey];
  }

  return {};
}

/**
 * Resolve a single field's meta for locale
 * Returns new meta object with resolved label/placeholder/helpText
 */
function resolveFieldMeta(
  meta: FieldDefinition['meta'],
  locale: SupportedLocale,
): Record<string, unknown> {
  if (!meta) return {};

  const { translations, label, placeholder, helpText, ...rest } = meta;
  const resolved = resolveFieldTranslation(
    translations as FieldTranslationsJson | undefined,
    locale,
  );

  return {
    ...rest,
    // Resolved translations (fallback to original values)
    label: resolved.label || label,
    placeholder: resolved.placeholder || placeholder,
    helpText: resolved.helpText || helpText,
  };
}

/**
 * Recursively resolve field definitions for locale
 * Handles nested fields and array items
 */
function resolveFieldsForLocale(
  fields: FieldDefinition[] | undefined,
  locale: SupportedLocale,
): FieldDefinition[] | undefined {
  if (!fields || !Array.isArray(fields)) return fields;

  return fields.map((field) => ({
    ...field,
    meta: resolveFieldMeta(field.meta, locale),
    // Recursively resolve nested fields
    fields: field.fields ? resolveFieldsForLocale(field.fields, locale) : undefined,
    // Recursively resolve array items
    items: field.items
      ? {
          ...field.items,
          meta: resolveFieldMeta(field.items.meta, locale),
          fields: field.items.fields
            ? resolveFieldsForLocale(field.items.fields, locale)
            : undefined,
        }
      : undefined,
  }));
}

/**
 * Resolve entire definition JSON for locale
 * Returns new definition with all field labels resolved
 */
export function resolveDefinitionFieldsForLocale(
  definition: unknown,
  locale: SupportedLocale,
): unknown {
  if (!definition || typeof definition !== 'object') return definition;

  const def = definition as SectionDefinitionJson;
  if (!def.fields) return definition;

  return {
    ...def,
    fields: resolveFieldsForLocale(def.fields, locale),
  };
}
