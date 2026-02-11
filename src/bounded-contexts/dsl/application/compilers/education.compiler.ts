import type { Education } from '@prisma/client';
import { applyOverrides, type EducationItem, type ItemOverride, type SectionData } from './shared';

export function compileEducation(education: Education[], overrides: ItemOverride[]): SectionData {
  const items = applyOverrides(education, overrides).map(
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
