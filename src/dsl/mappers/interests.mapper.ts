/**
 * Interests Section Mapper
 *
 * Maps resume interest entries to AST interest section data.
 */

import type {
  SectionData,
  InterestItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

export class InterestsSectionMapper implements SectionMapper {
  readonly sectionId = 'interests';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.interests, overrides).map(
      (int): InterestItem => ({
        id: int.id,
        name: int.name,
        keywords: int.description ? [int.description] : [],
      }),
    );

    return { type: 'interests', items };
  }

  getPlaceholder(): SectionData {
    return { type: 'interests', items: [] };
  }
}
