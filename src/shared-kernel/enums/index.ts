/**
 * Domain Enums
 *
 * Pure domain enums - independent of infrastructure.
 * These define the business vocabulary of the system.
 */

// Collaborator Role
export {
  type CollaboratorRole,
  CollaboratorRoleSchema,
  canRoleEdit,
  canRoleManage,
} from './collaborator-role.enum';
// Platform Enums (Theme Mode, Palette, Language, etc.)
export {
  type DateFormat,
  type DateFormatPattern,
  DateFormatPatternSchema,
  DateFormatPatterns,
  // Date Format
  DateFormatSchema,
  type ExportFormat,
  type ExportFormatKebab,
  ExportFormatKebabSchema,
  // Export Format
  ExportFormatSchema,
  exportFormatFromKebab,
  exportFormatToKebab,
  type LanguageProficiency,
  type LanguageProficiencyKebab,
  LanguageProficiencyKebabSchema,
  // Language Proficiency
  LanguageProficiencySchema,
  LanguageProficiencyToNumeric,
  languageProficiencyFromKebab,
  languageProficiencyToKebab,
  type Palette,
  type PaletteKebab,
  PaletteKebabSchema,
  // Palette
  PaletteSchema,
  type ProfileVisibility,
  type ProfileVisibilityKebab,
  ProfileVisibilityKebabSchema,
  // Profile Visibility
  ProfileVisibilitySchema,
  paletteFromKebab,
  paletteToKebab,
  profileVisibilityFromKebab,
  profileVisibilityToKebab,
  type ThemeMode,
  type ThemeModeKebab,
  ThemeModeKebabSchema,
  // Theme Mode
  ThemeModeSchema,
  themeModeFromKebab,
  themeModeToKebab,
  type UILanguage,
  type UILanguageKebab,
  UILanguageKebabSchema,
  // UI Language
  UILanguageSchema,
  uiLanguageFromKebab,
  uiLanguageToKebab,
} from './platform.enum';
// Resume Template
export {
  type ResumeTemplate,
  type ResumeTemplateKebab,
  ResumeTemplateKebabSchema,
  ResumeTemplateSchema,
  resumeTemplateFromKebab,
  resumeTemplateToKebab,
} from './resume-template.enum';
// Skill Level
export {
  type SkillLevel,
  SkillLevelSchema,
  SkillLevelToNumeric,
} from './skill-level.enum';
// Skill Type
export {
  type SkillType,
  type SkillTypeKebab,
  SkillTypeKebabSchema,
  SkillTypeSchema,
  skillTypeFromKebab,
  skillTypeToKebab,
} from './skill-type.enum';
// Tech Area
export {
  type TechAreaType,
  type TechAreaTypeKebab,
  TechAreaTypeKebabSchema,
  TechAreaTypeSchema,
  techAreaTypeFromKebab,
  techAreaTypeToKebab,
} from './tech-area.enum';
// Tech Persona
export {
  type TechPersona,
  TechPersonaEnum,
  type TechPersonaKebab,
  TechPersonaKebabSchema,
  TechPersonaSchema,
  techPersonaFromKebab,
  techPersonaToKebab,
} from './tech-persona.enum';
// Theme
export {
  type ThemeCategory,
  ThemeCategorySchema,
  type ThemeStatus,
  ThemeStatusSchema,
} from './theme.enum';
// User Role
export { type UserRole, UserRoleSchema } from './user-role.enum';
