/**
 * Language Constants
 *
 * Single source of truth for language proficiency levels.
 * Includes both simplified levels and CEFR (Common European Framework of Reference) levels.
 */

/**
 * Simplified language proficiency levels
 */
export const LANGUAGE_LEVELS = [
  'basic',
  'intermediate',
  'advanced',
  'fluent',
  'native',
] as const;

/**
 * CEFR (Common European Framework of Reference for Languages) levels
 * International standard for describing language ability
 *
 * A1-A2: Basic user
 * B1-B2: Independent user
 * C1-C2: Proficient user
 */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/**
 * Language constants grouping
 */
export const LANGUAGE_CONSTANTS = {
  LEVELS: LANGUAGE_LEVELS,
  CEFR_LEVELS: CEFR_LEVELS,

  /**
   * Mapping of simplified levels to CEFR ranges
   */
  LEVEL_TO_CEFR: {
    basic: ['A1', 'A2'],
    intermediate: ['B1'],
    advanced: ['B2'],
    fluent: ['C1'],
    native: ['C2'],
  },
} as const;

/**
 * Language level type
 */
export type LanguageLevel = typeof LANGUAGE_LEVELS[number];

/**
 * CEFR level type
 */
export type CEFRLevel = typeof CEFR_LEVELS[number];

/**
 * Type guard for language level
 */
export const isValidLanguageLevel = (value: unknown): value is LanguageLevel => {
  return typeof value === 'string' && LANGUAGE_LEVELS.includes(value as LanguageLevel);
};

/**
 * Type guard for CEFR level
 */
export const isValidCEFRLevel = (value: unknown): value is CEFRLevel => {
  return typeof value === 'string' && CEFR_LEVELS.includes(value as CEFRLevel);
};
