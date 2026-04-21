/**
 * Public API of the `@packages/i18n` dictionary.
 *
 * Consumed today by `I18nService` (backend exception filter) and planned for
 * the `/v1/i18n/dictionary/*` endpoints in phase 3.2+. The frontend can
 * import the same TS module directly once the monorepo is wired.
 */

export type { ErrorCode } from './errors';
export { ERROR_DICTIONARY } from './errors';
export type { Locale, LocalizedDictionary, LocalizedMessages } from './types';
export { DEFAULT_LOCALE, LOCALES } from './types';
