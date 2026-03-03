/**
 * Generic Section Types
 *
 * Canonical types for the generic resume sections model.
 * All section-specific logic should use these types, not legacy buckets.
 */

/**
 * Semantic kind for resume sections.
 * This is a plain string — new section types can be added in the DB
 * without touching any code. No more union of doom.
 *
 * @example 'WORK_EXPERIENCE' | 'EDUCATION' | 'SKILL_SET' | 'MY_CUSTOM_SECTION'
 */
export type SemanticKind = string;

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
