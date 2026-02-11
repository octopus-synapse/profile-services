/**
 * Stack Overflow Translations
 * Re-exports skill translations for Stack Overflow tag parsing
 */

import { SKILL_TRANSLATIONS } from './skill-translations.const';

/**
 * Stack Overflow specific translations
 * Uses the general skill translations but can be extended with SO-specific mappings
 */
export const STACKOVERFLOW_TRANSLATIONS: Record<string, string> = SKILL_TRANSLATIONS;
