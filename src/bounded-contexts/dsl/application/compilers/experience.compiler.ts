import type { Experience } from '@prisma/client';
import { applyOverrides, type ExperienceItem, type ItemOverride, type SectionData } from './shared';

export function compileExperience(
  experiences: Experience[],
  overrides: ItemOverride[],
): SectionData {
  const items = applyOverrides(experiences, overrides).map(
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
