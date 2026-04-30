/**
 * Core types for the localization dictionary.
 *
 * Kept intentionally tiny: one locale union, one entry shape, one dictionary
 * shape. Everything else (error codes, enum values, notification codes) is
 * expressed as a `Record<string, LocalizedMessages>` so the structure scales
 * without a type-level combinatorial explosion.
 */

export type Locale = 'en' | 'pt-BR';

export const LOCALES: readonly Locale[] = ['en', 'pt-BR'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

export interface LocalizedMessages {
  readonly en: string;
  readonly 'pt-BR': string;
}

export type LocalizedDictionary<K extends string = string> = Readonly<Record<K, LocalizedMessages>>;
