/**
 * Education Section Mapper
 *
 * Maps resume education entries to AST education section data.
 */

import type {
  SectionData,
  EducationItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

export class EducationSectionMapper implements SectionMapper {
  readonly sectionId = 'education';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.education, overrides).map(
      (edu): EducationItem => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.field,
        location: edu.location ? { city: edu.location } : undefined,
        dateRange: {
          startDate: edu.startDate.toISOString(),
          endDate: edu.endDate?.toISOString(),
          isCurrent: edu.isCurrent,
        },
        grade: edu.gpa ?? undefined,
        activities: [],
      }),
    );

    return { type: 'education', items };
  }

  getPlaceholder(): SectionData {
    return { type: 'education', items: [] };
  }
}
