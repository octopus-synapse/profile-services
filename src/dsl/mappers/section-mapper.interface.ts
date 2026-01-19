/**
 * Section Mapper Interface
 *
 * Strategy pattern for mapping resume data to section-specific AST data.
 * Each section type (experience, education, skills, etc.) has its own mapper.
 *
 * Design Rationale:
 * - Single Responsibility: Each mapper handles one section type
 * - Open/Closed: New sections = new mappers, no existing code changes
 * - Testability: Each mapper can be tested in isolation
 */

import type { SectionData } from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';

/**
 * Override configuration for individual items within a section
 */
export interface ItemOverride {
  itemId: string;
  visible?: boolean;
  order?: number;
}

/**
 * Section Mapper Interface
 *
 * Implement this interface for each section type to map
 * Prisma entities to AST section data.
 */
export interface SectionMapper {
  /**
   * The section ID this mapper handles (e.g., 'experience', 'education')
   */
  readonly sectionId: string;

  /**
   * Map resume data to section-specific AST data
   *
   * @param resume - The full resume with all relations
   * @param overrides - Item-level visibility and order overrides
   * @returns Section data for the AST, or undefined if section is empty/invalid
   */
  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined;

  /**
   * Get placeholder data for preview/empty state
   */
  getPlaceholder(): SectionData;
}

/**
 * Base helper to apply visibility and order overrides to items
 */
export function applyItemOverrides<T extends { id: string; order: number }>(
  items: T[],
  overrides: ItemOverride[],
): T[] {
  return items
    .filter((item) => {
      const override = overrides.find((o) => o.itemId === item.id);
      return override?.visible !== false;
    })
    .map((item) => {
      const override = overrides.find((o) => o.itemId === item.id);
      if (override?.order !== undefined) {
        return { ...item, order: override.order };
      }
      return item;
    })
    .sort((a, b) => a.order - b.order);
}
