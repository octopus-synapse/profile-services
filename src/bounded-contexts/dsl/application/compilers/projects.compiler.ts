import type { Project } from '@prisma/client';
import {
  applyOverrides,
  type ProjectItem,
  type ItemOverride,
  type SectionData,
} from './shared';

export function compileProjects(
  projects: Project[],
  overrides: ItemOverride[],
): SectionData {
  const items = applyOverrides(projects, overrides).map(
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
