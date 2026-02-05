/**
 * Theme Constants
 *
 * Single source of truth for theme-related constants.
 * Used by both frontend and backend for consistent theme validation.
 */

export const THEME_CONSTANTS = {
  /**
   * Valid layout types for resume themes
   */
  VALID_LAYOUT_TYPES: [
    'single-column',
    'two-column',
    'sidebar-left',
    'sidebar-right',
    'modern',
    'classic',
  ] as const,

  /**
   * Valid font families
   */
  VALID_FONT_FAMILIES: [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Source Sans Pro',
    'Merriweather',
    'PT Serif',
  ] as const,

  /**
   * Font size limits (in pixels)
   */
  FONT_SIZE: {
    MIN: 8,
    MAX: 72,
    DEFAULT: 14,
  },

  /**
   * Spacing limits (in pixels)
   */
  SPACING: {
    MIN: 0,
    MAX: 100,
    DEFAULT: 16,
  },

  /**
   * Color validation pattern (hex color)
   */
  COLOR_PATTERN: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
} as const;

/**
 * Layout type union
 */
export type LayoutType = typeof THEME_CONSTANTS.VALID_LAYOUT_TYPES[number];

/**
 * Font family union
 */
export type FontFamily = typeof THEME_CONSTANTS.VALID_FONT_FAMILIES[number];

/**
 * Type guard for layout type
 */
export const isValidLayoutType = (value: unknown): value is LayoutType => {
  return (
    typeof value === 'string' &&
    THEME_CONSTANTS.VALID_LAYOUT_TYPES.includes(value as LayoutType)
  );
};

/**
 * Type guard for hex color
 */
export const isValidHexColor = (value: unknown): boolean => {
  return typeof value === 'string' && THEME_CONSTANTS.COLOR_PATTERN.test(value);
};
