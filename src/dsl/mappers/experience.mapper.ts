/**
 * Experience Section Mapper
 *
 * Maps resume experience entries to AST experience section data.
 */

import type {
  SectionData,
  ExperienceItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

export class ExperienceSectionMapper implements SectionMapper {
  readonly sectionId = 'experience';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.experiences, overrides).map(
      (exp): ExperienceItem => ({
        id: exp.id,
        title: exp.position,
        company: exp.company,
        location: exp.location ? { city: exp.location } : undefined,
        dateRange: {
          startDate: exp.startDate.toISOString(),
          endDate: exp.endDate?.toISOString(),
          isCurrent: exp.isCurrent,
        },
        description: exp.description ?? undefined,
        achievements: [],
        skills: exp.skills,
      }),
    );

    return { type: 'experience', items };
  }

  getPlaceholder(): SectionData {
    return { type: 'experience', items: [] };
  }
}
