/**
 * Generic Section Types
 *
 * Canonical types for the generic resume sections model.
 * All section-specific logic should use these types, not legacy buckets.
 *
 * The code is SECTION-AGNOSTIC - it doesn't know what "experience" or "education" is.
 * All section knowledge lives in SectionType.definition (DB).
 */

import type {
  AtsConfig,
  AtsSectionDetection,
  DocxExportConfig,
  ExportConfig,
  SectionDefinition,
  SectionFieldDefinition,
  SectionKind,
  SemanticRole,
} from './semantic-sections.schema';

// Re-export Zod-inferred types for convenience
export type {
  SectionDefinition,
  SectionFieldDefinition,
  AtsConfig,
  ExportConfig,
  AtsSectionDetection,
  DocxExportConfig,
  SemanticRole,
  SectionKind,
};

/**
 * Semantic kind for resume sections.
 * This is a plain string — new section types can be added in the DB
 * without touching any code. No more union of doom.
 *
 * @example 'WORK_EXPERIENCE' | 'EDUCATION' | 'SKILL_SET' | 'MY_CUSTOM_SECTION'
 */
export type SemanticKind = string;

// ============================================================================
// Database Entity Types (what Prisma returns)
// ============================================================================

/**
 * SectionType entity from database.
 * Contains the definition JSON that drives all behavior.
 */
export interface SectionTypeRecord {
  id: string;
  key: string;
  slug: string;
  title: string;
  description: string | null;
  semanticKind: SemanticKind;
  version: number;
  isRepeatable: boolean;
  minItems: number;
  maxItems: number | null;
  definition: unknown; // JSON, must be parsed with SectionDefinitionSchema
  uiSchema: unknown | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SectionType with parsed definition - ready for use.
 */
export interface SectionTypeWithDefinition {
  id: string;
  key: string;
  slug: string;
  title: string;
  description: string | null;
  semanticKind: SemanticKind;
  version: number;
  isRepeatable: boolean;
  minItems: number;
  maxItems: number | null;
  definition: SectionDefinition;
  uiSchema: unknown | null;
  isActive: boolean;
}

/**
 * Generic section item from database.
 * This is the canonical representation of any section item.
 */
export interface GenericSectionItem {
  id: string;
  order: number;
  isVisible: boolean;
  content: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generic resume section from database.
 */
export interface GenericResumeSection {
  id: string;
  resumeId: string;
  sectionTypeId: string;
  sectionTypeKey: string;
  semanticKind: SemanticKind;
  title: string;
  titleOverride: string | null;
  isVisible: boolean;
  order: number;
  items: GenericSectionItem[];
}

/**
 * Resume section with full SectionType data included.
 */
export interface GenericResumeSectionWithType extends GenericResumeSection {
  sectionType: SectionTypeWithDefinition;
}

/**
 * Resume with generic sections - the canonical resume representation.
 * No legacy bucket arrays (experiences, education, etc.).
 */
export interface GenericResume {
  id: string;
  userId: string;
  title: string | null;
  summary: string | null;
  fullName: string | null;
  jobTitle: string | null;
  phone: string | null;
  emailContact: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  sections: GenericResumeSection[];
  activeTheme?: {
    id: string;
    name: string;
    styleConfig: unknown;
  } | null;
  customTheme?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resume with sections that include their SectionType definitions.
 */
export interface GenericResumeWithTypes extends Omit<GenericResume, 'sections'> {
  sections: GenericResumeSectionWithType[];
}

// ============================================================================
// Projection Types (lightweight views for specific use cases)
// ============================================================================

/**
 * Lightweight section item for projections.
 */
export interface ProjectedSectionItem {
  id: string;
  order: number;
  content: Record<string, unknown>;
}

/**
 * Lightweight section for projections.
 */
export interface ProjectedSection {
  semanticKind: SemanticKind;
  title: string;
  items: ProjectedSectionItem[];
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Field validation error.
 */
export interface FieldValidationError {
  fieldKey: string;
  semanticRole?: SemanticRole;
  message: string;
  code: 'REQUIRED' | 'TYPE_MISMATCH' | 'CONSTRAINT_VIOLATION' | 'INVALID_ENUM';
}

/**
 * Section item validation result.
 */
export interface SectionItemValidationResult {
  isValid: boolean;
  itemId?: string;
  errors: FieldValidationError[];
}

/**
 * Section validation result.
 */
export interface SectionValidationResult {
  isValid: boolean;
  sectionId: string;
  sectionTypeKey: string;
  itemResults: SectionItemValidationResult[];
  sectionErrors: string[]; // e.g., "minimum 1 item required"
}

// ============================================================================
// ATS Types (definition-driven scoring)
// ============================================================================

/**
 * ATS score breakdown for a single section.
 */
export interface AtsSectionScore {
  sectionTypeKey: string;
  semanticKind: SemanticKind;
  baseScore: number;
  fieldScores: Record<SemanticRole, number>;
  totalScore: number;
  maxPossibleScore: number;
  missingRequiredRoles: SemanticRole[];
}

/**
 * Full ATS analysis result.
 */
export interface AtsAnalysisResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  sectionScores: AtsSectionScore[];
  recommendations: string[];
}

// ============================================================================
// Export Types (definition-driven export mapping)
// ============================================================================

/**
 * Mapped item for export (field values mapped per ExportConfig).
 */
export interface ExportMappedItem {
  [mappedKey: string]: unknown;
}

/**
 * Mapped section for export.
 */
export interface ExportMappedSection {
  sectionKey: string;
  items: ExportMappedItem[];
}

/**
 * Full export payload (e.g., for JSON Resume format).
 */
export interface ExportPayload {
  [sectionKey: string]: ExportMappedItem[];
}

// ============================================================================
// Definition Accessor Helpers (read configs from definition)
// ============================================================================

/**
 * Extract ATS config from a section definition.
 */
export function getAtsConfig(definition: SectionDefinition): AtsConfig {
  return (
    definition.ats ?? {
      isMandatory: false,
      recommendedPosition: 99,
      scoring: { baseScore: 0, fieldWeights: {} },
    }
  );
}

/**
 * Extract section detection keywords from definition.
 */
export function getSectionDetection(definition: SectionDefinition): AtsSectionDetection {
  return (
    definition.ats?.sectionDetection ?? {
      keywords: [],
      multiWord: [],
    }
  );
}

/**
 * Extract export config from a section definition.
 */
export function getExportConfig(definition: SectionDefinition): ExportConfig {
  return definition.export ?? {};
}

/**
 * Extract docx export config from a section definition.
 */
export function getDocxConfig(definition: SectionDefinition): DocxExportConfig | undefined {
  return definition.export?.docx;
}

/**
 * Get field definition by key.
 */
export function getFieldByKey(
  definition: SectionDefinition,
  fieldKey: string,
): SectionFieldDefinition | undefined {
  return definition.fields.find((f) => f.key === fieldKey);
}

/**
 * Get field definition by semantic role.
 */
export function getFieldByRole(
  definition: SectionDefinition,
  role: SemanticRole,
): SectionFieldDefinition | undefined {
  return definition.fields.find((f) => f.semanticRole === role);
}

/**
 * Get all required fields from definition.
 */
export function getRequiredFields(definition: SectionDefinition): SectionFieldDefinition[] {
  return definition.fields.filter((f) => f.required === true);
}

/**
 * Check if section is mandatory for ATS.
 */
export function isMandatorySection(definition: SectionDefinition): boolean {
  return definition.ats?.isMandatory ?? false;
}
