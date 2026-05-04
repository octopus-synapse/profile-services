export type SupportedLocale = 'en' | 'pt-BR';

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'pt-BR'];

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
