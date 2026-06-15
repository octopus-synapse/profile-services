import {
  DEFAULT_LOCALE as CANONICAL_DEFAULT_LOCALE,
  LOCALES as CANONICAL_LOCALES,
  type Locale as CanonicalLocale,
} from '@packages/i18n';

export type Locale = CanonicalLocale;
export const DEFAULT_LOCALE = CANONICAL_DEFAULT_LOCALE;
export const LOCALES: readonly Locale[] = CANONICAL_LOCALES;

export type SupportedLocale = Locale;
export const SUPPORTED_LOCALES: readonly Locale[] = CANONICAL_LOCALES;

/** Translation structure stored in SectionType.translations JSON */
export interface SectionTypeTranslation {
  title: string;
  description: string;
  label: string;
  noDataLabel: string;
  placeholder: string;
  addLabel: string;
}

export type TranslationsJson = Record<string, SectionTypeTranslation>;

/** Field-level translation (in definition.fields[].meta.translations). */
export interface FieldTranslation {
  label?: string;
  placeholder?: string;
  helpText?: string;
}

export type FieldTranslationsJson = Record<string, FieldTranslation>;

/** Section type with translations resolved to single locale. */
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
}

/** Field definition with potential translations. */
export interface FieldDefinition {
  key?: string;
  type: string;
  /** Canonical SCREAMING_CASE values for an enum field (Zod validates these). */
  enum?: string[];
  /** Locale-resolved {value,label} pairs the resolver injects for enum fields
   *  carrying `meta.enumName` — the editor renders the label, stores the value. */
  options?: Array<{ value: string; label: string }>;
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

/** Definition structure with fields array. */
export interface SectionDefinitionJson {
  schemaVersion?: number;
  kind?: string;
  fields?: FieldDefinition[];
  [key: string]: unknown;
}
