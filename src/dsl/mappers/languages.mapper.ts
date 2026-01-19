/**
 * Languages Section Mapper
 *
 * Maps resume language entries to AST language section data.
 */

import type {
  SectionData,
  LanguageItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

export class LanguagesSectionMapper implements SectionMapper {
  readonly sectionId = 'languages';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.languages, overrides).map(
      (lang): LanguageItem => ({
        id: lang.id,
        name: lang.name,
        proficiency: lang.level,
      }),
    );

    return { type: 'languages', items };
  }

  getPlaceholder(): SectionData {
    return { type: 'languages', items: [] };
  }
}
