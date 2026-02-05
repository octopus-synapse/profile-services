/**
 * Domain Enums
 *
 * Pure domain enums - independent of infrastructure.
 * These define the business vocabulary of the system.
 */

// Skill Level
export {
  SkillLevelSchema,
  SkillLevelToNumeric,
  type SkillLevel,
} from './skill-level.enum';

// Skill Type
export {
  SkillTypeSchema,
  SkillTypeKebabSchema,
  skillTypeToKebab,
  skillTypeFromKebab,
  type SkillType,
  type SkillTypeKebab,
} from './skill-type.enum';

// Tech Area
export {
  TechAreaTypeSchema,
  TechAreaTypeKebabSchema,
  techAreaTypeToKebab,
  techAreaTypeFromKebab,
  type TechAreaType,
  type TechAreaTypeKebab,
} from './tech-area.enum';

// Resume Template
export {
  ResumeTemplateSchema,
  ResumeTemplateKebabSchema,
  resumeTemplateToKebab,
  resumeTemplateFromKebab,
  type ResumeTemplate,
  type ResumeTemplateKebab,
} from './resume-template.enum';

// Theme
export {
  ThemeStatusSchema,
  ThemeCategorySchema,
  type ThemeStatus,
  type ThemeCategory,
} from './theme.enum';

// User Role
export { UserRoleSchema, type UserRole } from './user-role.enum';

// Collaborator Role
export {
  CollaboratorRoleSchema,
  canRoleEdit,
  canRoleManage,
  type CollaboratorRole,
} from './collaborator-role.enum';

// Platform Enums (Theme Mode, Palette, Language, etc.)
export {
  // Theme Mode
  ThemeModeSchema,
  ThemeModeKebabSchema,
  themeModeToKebab,
  themeModeFromKebab,
  type ThemeMode,
  type ThemeModeKebab,
  // Palette
  PaletteSchema,
  PaletteKebabSchema,
  paletteToKebab,
  paletteFromKebab,
  type Palette,
  type PaletteKebab,
  // UI Language
  UILanguageSchema,
  UILanguageKebabSchema,
  uiLanguageToKebab,
  uiLanguageFromKebab,
  type UILanguage,
  type UILanguageKebab,
  // Date Format
  DateFormatSchema,
  DateFormatPatterns,
  DateFormatPatternSchema,
  type DateFormat,
  type DateFormatPattern,
  // Profile Visibility
  ProfileVisibilitySchema,
  ProfileVisibilityKebabSchema,
  profileVisibilityToKebab,
  profileVisibilityFromKebab,
  type ProfileVisibility,
  type ProfileVisibilityKebab,
  // Export Format
  ExportFormatSchema,
  ExportFormatKebabSchema,
  exportFormatToKebab,
  exportFormatFromKebab,
  type ExportFormat,
  type ExportFormatKebab,
  // Language Proficiency
  LanguageProficiencySchema,
  LanguageProficiencyKebabSchema,
  languageProficiencyToKebab,
  languageProficiencyFromKebab,
  LanguageProficiencyToNumeric,
  type LanguageProficiency,
  type LanguageProficiencyKebab,
} from './platform.enum';

// Tech Persona
export {
  TechPersonaSchema,
  TechPersonaEnum,
  TechPersonaKebabSchema,
  techPersonaToKebab,
  techPersonaFromKebab,
  type TechPersona,
  type TechPersonaKebab,
} from './tech-persona.enum';
