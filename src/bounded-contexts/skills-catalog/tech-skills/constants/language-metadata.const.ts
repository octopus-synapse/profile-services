/**
 * Language Metadata Constants
 * Aggregates language-related constants for GitHub Linguist parsing
 */

import { LANGUAGE_PARADIGMS } from './language-paradigms.const';
import { POPULARITY_ORDER } from './language-popularity.const';
import { LANGUAGE_TRANSLATIONS } from './language-translations.const';
import { LANGUAGE_TYPING } from './language-typing.const';
import { LANGUAGE_WEBSITES } from './language-websites.const';

/**
 * Language metadata configuration
 * Combines all language-related constants for easy access
 */
export const LANGUAGE_METADATA = {
  translations: LANGUAGE_TRANSLATIONS,
  paradigms: LANGUAGE_PARADIGMS,
  typing: LANGUAGE_TYPING,
  websites: LANGUAGE_WEBSITES,
  popularityOrder: POPULARITY_ORDER,
} as const;

/**
 * GitHub Linguist URL
 */
export const GITHUB_LINGUIST_URL =
  'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml';

// Re-export individual constants for backward compatibility
export { LANGUAGE_TRANSLATIONS };
export { LANGUAGE_PARADIGMS };
export { LANGUAGE_TYPING };
export { LANGUAGE_WEBSITES };
export { POPULARITY_ORDER };
