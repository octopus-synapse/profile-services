/**
 * Style Config JSON Schema Validation
 *
 * Validates theme configuration for resume rendering.
 * Uses pattern-based validation for section keys - no hardcoded section types.
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
 * Section key pattern: snake_case with at least one underscore.
 * Examples: section_type_v1, custom_section, portfolio_block_v2
 *
 * This pattern enforces that all section keys follow the convention
 * established by SectionType.key in the database.
 */
const SECTION_KEY_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

/**
 * Validates if a section ID follows the valid pattern.
 * Accepts snake_case identifiers with at least one underscore.
 *
 * Valid: section_type_v1, custom_section, portfolio_block_v2
 * Invalid: section, block, content
 */
function isValidSectionId(sectionId: string): boolean {
  return SECTION_KEY_PATTERN.test(sectionId);
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
