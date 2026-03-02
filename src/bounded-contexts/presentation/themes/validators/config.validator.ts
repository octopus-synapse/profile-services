/**
 * Style Config JSON Schema Validation
 *
 * Validates theme configuration for resume rendering.
 * Uses semantic section type keys exclusively - legacy IDs have been removed.
 */

import { BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';

const VALID_LAYOUT_TYPES = [
  'single-column',
  'two-column',
  'sidebar-left',
  'sidebar-right',
  'magazine',
  'compact',
];

/**
 * Semantic section type keys
 * These map to SectionType.key in the database
 */
const SEMANTIC_SECTION_KEYS = [
  // Core resume sections
  'header_v1',
  'summary_v1',
  'work_experience_v1',
  'education_v1',
  'skill_set_v1',
  'language_v1',
  'certification_v1',
  'project_v1',
  // Extended sections
  'award_v1',
  'publication_v1',
  'talk_v1',
  'open_source_v1',
  'hackathon_v1',
  'bug_bounty_v1',
  'interest_v1',
  'recommendation_v1',
  'achievement_v1',
];

/**
 * Validates if a section ID is acceptable.
 * Accepts:
 * 1. Semantic section type keys (e.g., work_experience_v1)
 * 2. Custom section keys with snake_case containing at least one underscore
 *
 * Legacy section IDs (experiences, education, skills, etc.) have been REMOVED.
 * Single-word IDs without underscores are now rejected.
 */
function isValidSectionId(sectionId: string): boolean {
  // Check semantic keys first
  if (SEMANTIC_SECTION_KEYS.includes(sectionId)) {
    return true;
  }

  // Allow custom sections following snake_case pattern WITH at least one underscore
  // This prevents legacy single-word IDs like "experiences", "skills", etc.
  // Valid: custom_section, my_portfolio, work_experience_custom
  // Invalid: experiences, skills, education (legacy single-word IDs)
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(sectionId)) {
    return true;
  }

  return false;
}

export function validateLayoutConfig(layout: unknown): void {
  if (!layout || typeof layout !== 'object') {
    throw new BadRequestException(ERROR_MESSAGES.LAYOUT_CONFIG_REQUIRED);
  }

  const l = layout as Record<string, unknown>;

  if (l.type && typeof l.type === 'string' && !VALID_LAYOUT_TYPES.includes(l.type)) {
    throw new BadRequestException(`Invalid layout type: ${String(l.type)}`);
  }
}

export function validateSectionsConfig(sections: unknown): void {
  if (!Array.isArray(sections)) {
    throw new BadRequestException(ERROR_MESSAGES.SECTIONS_MUST_BE_ARRAY);
  }

  for (const section of sections as Array<Record<string, unknown>>) {
    const sectionId = section.id as string;
    if (!sectionId || !isValidSectionId(sectionId)) {
      throw new BadRequestException(`Invalid section id: ${String(sectionId)}`);
    }
    if (typeof section.visible !== 'boolean') {
      throw new BadRequestException(`Section ${sectionId} must have visible property`);
    }
    if (typeof section.order !== 'number') {
      throw new BadRequestException(`Section ${sectionId} must have order property`);
    }
  }
}

export function validateItemOverrides(overrides: unknown): void {
  if (!overrides) return;

  if (typeof overrides !== 'object') {
    throw new BadRequestException(ERROR_MESSAGES.ITEM_OVERRIDES_MUST_BE_OBJECT);
  }

  for (const [sectionId, items] of Object.entries(overrides)) {
    if (!isValidSectionId(sectionId)) {
      throw new BadRequestException(`Invalid section in overrides: ${sectionId}`);
    }
    if (!Array.isArray(items)) {
      throw new BadRequestException(`Overrides for ${sectionId} must be array`);
    }
  }
}
