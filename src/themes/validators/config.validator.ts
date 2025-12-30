/**
 * Style Config JSON Schema Validation
 */

import { BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';

const VALID_LAYOUT_TYPES = [
  'single-column',
  'two-column',
  'sidebar-left',
  'sidebar-right',
  'magazine',
  'compact',
];

const VALID_SECTION_IDS = [
  'header',
  'summary',
  'experiences',
  'education',
  'skills',
  'languages',
  'certifications',
  'projects',
  'awards',
  'publications',
  'talks',
  'open-source',
  'hackathons',
  'bug-bounties',
  'interests',
  'recommendations',
  'achievements',
];

export function validateLayoutConfig(layout: unknown): void {
  if (!layout || typeof layout !== 'object') {
    throw new BadRequestException(ERROR_MESSAGES.LAYOUT_CONFIG_REQUIRED);
  }

  const l = layout as Record<string, unknown>;

  if (l.type && !VALID_LAYOUT_TYPES.includes(l.type as string)) {
    throw new BadRequestException(`Invalid layout type: ${l.type}`);
  }
}

export function validateSectionsConfig(sections: unknown): void {
  if (!Array.isArray(sections)) {
    throw new BadRequestException(ERROR_MESSAGES.SECTIONS_MUST_BE_ARRAY);
  }

  for (const section of sections) {
    if (!section.id || !VALID_SECTION_IDS.includes(section.id)) {
      throw new BadRequestException(`Invalid section id: ${section.id}`);
    }
    if (typeof section.visible !== 'boolean') {
      throw new BadRequestException(
        `Section ${section.id} must have visible property`,
      );
    }
    if (typeof section.order !== 'number') {
      throw new BadRequestException(
        `Section ${section.id} must have order property`,
      );
    }
  }
}

export function validateItemOverrides(overrides: unknown): void {
  if (!overrides) return;

  if (typeof overrides !== 'object') {
    throw new BadRequestException(ERROR_MESSAGES.ITEM_OVERRIDES_MUST_BE_OBJECT);
  }

  for (const [sectionId, items] of Object.entries(overrides)) {
    if (!VALID_SECTION_IDS.includes(sectionId)) {
      throw new BadRequestException(
        `Invalid section in overrides: ${sectionId}`,
      );
    }
    if (!Array.isArray(items)) {
      throw new BadRequestException(`Overrides for ${sectionId} must be array`);
    }
  }
}
