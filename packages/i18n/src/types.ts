export type Locale = 'en' | 'pt-BR';

export const LOCALES: readonly Locale[] = ['en', 'pt-BR'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

export type LocalizedMessages = Required<Record<Locale, string>>;
export type LocalizedRecord<T> = Required<Record<Locale, T>>;

export type LocalizedDictionary<K extends string = string> = Readonly<Record<K, LocalizedMessages>>;
