/**
 * Domain Enums - Shared Kernel
 *
 * Cross-cutting enums used by 3+ bounded contexts.
 * Single-context enums should live in their respective bounded-context/domain/enums/.
 */

// Platform Enums (Theme Mode, Palette, Language, etc.)
// Used by: identity, platform, export
export {
  type DateFormat,
  type DateFormatPattern,
  DateFormatPatternSchema,
  DateFormatPatterns, // Date Format
  DateFormatSchema,
  type ExportFormat,
  type ExportFormatKebab,
  ExportFormatKebabSchema, // Export Format
  ExportFormatSchema,
  exportFormatFromKebab,
  exportFormatToKebab,
  type LanguageProficiency,
  type LanguageProficiencyKebab,
  LanguageProficiencyKebabSchema, // Language Proficiency
  LanguageProficiencySchema,
  LanguageProficiencyToNumeric,
  languageProficiencyFromKebab,
  languageProficiencyToKebab,
  type Palette,
  type PaletteKebab,
  PaletteKebabSchema, // Palette
  PaletteSchema,
  paletteFromKebab,
  paletteToKebab,
  type ThemeMode,
  type ThemeModeKebab,
  ThemeModeKebabSchema, // Theme Mode
  ThemeModeSchema,
  themeModeFromKebab,
  themeModeToKebab,
  type UILanguage,
  type UILanguageKebab,
  UILanguageKebabSchema, // UI Language
  UILanguageSchema,
  uiLanguageFromKebab,
  uiLanguageToKebab,
} from './platform.enum';
