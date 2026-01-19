/**
 * Projects Section Mapper
 *
 * Maps resume project entries to AST project section data.
 */

import type {
  SectionData,
  ProjectItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

export class ProjectsSectionMapper implements SectionMapper {
  readonly sectionId = 'projects';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.projects, overrides).map(
      (proj): ProjectItem => ({
        id: proj.id,
        name: proj.name,
        description: proj.description ?? undefined,
        url: proj.url ?? undefined,
        dateRange: proj.startDate
          ? {
              startDate: proj.startDate.toISOString(),
              endDate: proj.endDate?.toISOString(),
              isCurrent: proj.isCurrent,
            }
          : undefined,
        technologies: proj.technologies,
        highlights: [],
      }),
    );

    return { type: 'projects', items };
  }

  getPlaceholder(): SectionData {
    return { type: 'projects', items: [] };
  }
}
