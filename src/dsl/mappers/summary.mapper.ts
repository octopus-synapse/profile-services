/**
 * Summary Section Mapper
 *
 * Maps resume summary to AST summary section data.
 */

import type { SectionData } from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import type { SectionMapper, ItemOverride } from './section-mapper.interface';

export class SummarySectionMapper implements SectionMapper {
  readonly sectionId = 'summary';

  map(
    resume: ResumeWithRelations,
    _overrides: ItemOverride[],
  ): SectionData | undefined {
    return {
      type: 'summary',
      data: { content: resume.summary ?? '' },
    };
  }

  getPlaceholder(): SectionData {
    return { type: 'summary', data: { content: '' } };
  }
}
