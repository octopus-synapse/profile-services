import { z } from 'zod';

/**
 * Platform Enums (Domain)
 *
 * Core platform settings and configuration enums.
 * These are business-level concepts used across the entire platform.
 */

// ============================================================================
// Theme Mode (Light/Dark/Auto)
// ============================================================================

export const ThemeModeSchema = z.enum(['LIGHT', 'DARK', 'AUTO']);
export type ThemeMode = z.infer<typeof ThemeModeSchema>;

/**
 * Kebab-case version for API compatibility
 */
export const ThemeModeKebabSchema = z.enum(['light', 'dark', 'auto']);
export type ThemeModeKebab = z.infer<typeof ThemeModeKebabSchema>;

export const themeModeToKebab = (value: ThemeMode): ThemeModeKebab => {
  return value.toLowerCase() as ThemeModeKebab;
};

export const themeModeFromKebab = (value: ThemeModeKebab): ThemeMode => {
  return value.toUpperCase() as ThemeMode;
};

// ============================================================================
// Color Palette
// ============================================================================

export const PaletteSchema = z.enum([
  'OCEAN',
  'SUNSET',
  'FOREST',
  'LAVENDER',
  'ROSE',
  'MONOCHROME',
]);
export type Palette = z.infer<typeof PaletteSchema>;

export const PaletteKebabSchema = z.enum([
  'ocean',
  'sunset',
  'forest',
  'lavender',
  'rose',
  'monochrome',
]);
export type PaletteKebab = z.infer<typeof PaletteKebabSchema>;

export const paletteToKebab = (value: Palette): PaletteKebab => {
  return value.toLowerCase() as PaletteKebab;
};

export const paletteFromKebab = (value: PaletteKebab): Palette => {
  return value.toUpperCase() as Palette;
};

// ============================================================================
// UI Language
// ============================================================================

export const UILanguageSchema = z.enum(['EN', 'PT_BR', 'ES']);
export type UILanguage = z.infer<typeof UILanguageSchema>;

export const UILanguageKebabSchema = z.enum(['en', 'pt-br', 'es']);
export type UILanguageKebab = z.infer<typeof UILanguageKebabSchema>;

export const uiLanguageToKebab = (value: UILanguage): UILanguageKebab => {
  const mapping: Record<UILanguage, UILanguageKebab> = {
    EN: 'en',
    PT_BR: 'pt-br',
    ES: 'es',
  };
  return mapping[value];
};

export const uiLanguageFromKebab = (value: UILanguageKebab): UILanguage => {
  const mapping: Record<UILanguageKebab, UILanguage> = {
    en: 'EN',
    'pt-br': 'PT_BR',
    es: 'ES',
  };
  return mapping[value];
};

// ============================================================================
// Date Format
// ============================================================================

export const DateFormatSchema = z.enum(['MDY', 'DMY', 'YMD']);
export type DateFormat = z.infer<typeof DateFormatSchema>;

/**
 * Display format patterns
 */
export const DateFormatPatterns: Record<DateFormat, string> = {
  MDY: 'MM/DD/YYYY',
  DMY: 'DD/MM/YYYY',
  YMD: 'YYYY-MM-DD',
};

export const DateFormatPatternSchema = z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']);
export type DateFormatPattern = z.infer<typeof DateFormatPatternSchema>;

// ============================================================================
// Profile Visibility
// ============================================================================

export const ProfileVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']);
export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;

export const ProfileVisibilityKebabSchema = z.enum(['public', 'private', 'unlisted']);
export type ProfileVisibilityKebab = z.infer<typeof ProfileVisibilityKebabSchema>;

export const profileVisibilityToKebab = (value: ProfileVisibility): ProfileVisibilityKebab => {
  return value.toLowerCase() as ProfileVisibilityKebab;
};

export const profileVisibilityFromKebab = (value: ProfileVisibilityKebab): ProfileVisibility => {
  return value.toUpperCase() as ProfileVisibility;
};

// ============================================================================
// Export Format
// ============================================================================

export const ExportFormatSchema = z.enum(['PDF', 'DOCX', 'JSON']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportFormatKebabSchema = z.enum(['pdf', 'docx', 'json']);
export type ExportFormatKebab = z.infer<typeof ExportFormatKebabSchema>;

export const exportFormatToKebab = (value: ExportFormat): ExportFormatKebab => {
  return value.toLowerCase() as ExportFormatKebab;
};

export const exportFormatFromKebab = (value: ExportFormatKebab): ExportFormat => {
  return value.toUpperCase() as ExportFormat;
};

// ============================================================================
// Language Proficiency (Spoken Languages)
// ============================================================================

export const LanguageProficiencySchema = z.enum(['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']);
export type LanguageProficiency = z.infer<typeof LanguageProficiencySchema>;

export const LanguageProficiencyKebabSchema = z.enum([
  'basic',
  'conversational',
  'fluent',
  'native',
]);
export type LanguageProficiencyKebab = z.infer<typeof LanguageProficiencyKebabSchema>;

export const languageProficiencyToKebab = (
  value: LanguageProficiency,
): LanguageProficiencyKebab => {
  return value.toLowerCase() as LanguageProficiencyKebab;
};

export const languageProficiencyFromKebab = (
  value: LanguageProficiencyKebab,
): LanguageProficiency => {
  return value.toUpperCase() as LanguageProficiency;
};

/**
 * Numeric mapping for sorting/comparison
 */
export const LanguageProficiencyToNumeric: Record<LanguageProficiency, number> = {
  BASIC: 1,
  CONVERSATIONAL: 2,
  FLUENT: 3,
  NATIVE: 4,
};
