/**
 * References Section Mapper
 *
 * Maps resume recommendation entries to AST reference section data.
 */

import type {
  SectionData,
  ReferenceItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

export class ReferencesSectionMapper implements SectionMapper {
  readonly sectionId = 'references';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.recommendations, overrides).map(
      (rec): ReferenceItem => ({
        id: rec.id,
        name: rec.author,
        role: rec.position ?? '',
        company: rec.company ?? undefined,
      }),
    );

    return { type: 'references', items };
  }

  getPlaceholder(): SectionData {
    return { type: 'references', items: [] };
  }
}
