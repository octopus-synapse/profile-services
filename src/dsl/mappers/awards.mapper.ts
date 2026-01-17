/**
 * Awards Section Mapper
 *
 * Maps resume award entries to AST award section data.
 */

import type {
  SectionData,
  AwardItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

export class AwardsSectionMapper implements SectionMapper {
  readonly sectionId = 'awards';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.awards, overrides).map(
      (award): AwardItem => ({
        id: award.id,
        title: award.title,
        issuer: award.issuer,
        date: award.date.toISOString(),
        description: award.description ?? undefined,
      }),
    );

    return { type: 'awards', items };
  }

  getPlaceholder(): SectionData {
    return { type: 'awards', items: [] };
  }
}
