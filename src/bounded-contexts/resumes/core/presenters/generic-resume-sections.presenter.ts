import { resolveSectionTypeForLocale } from '@/shared-kernel/utils/locale-resolver';
import type { ResumeSectionTypesDataDto } from '../dto/generic-sections-response.dto';

type SectionTypeLike = Parameters<typeof resolveSectionTypeForLocale>[0];

export function toResumeSectionTypesData(
  rawSectionTypes: SectionTypeLike[],
  locale: Parameters<typeof resolveSectionTypeForLocale>[1],
): ResumeSectionTypesDataDto {
  const sectionTypes: ResumeSectionTypesDataDto['sectionTypes'] = [];
  for (const st of rawSectionTypes) {
    const resolved = resolveSectionTypeForLocale(st, locale);
    sectionTypes.push({
      ...resolved,
      definition: (resolved.definition ?? {}) as Record<string, unknown>,
      uiSchema: (resolved.uiSchema as Record<string, unknown>) ?? null,
      renderHints: (resolved.renderHints ?? {}) as Record<string, unknown>,
      fieldStyles: (resolved.fieldStyles ?? {}) as Record<string, unknown>,
    });
  }
  return { sectionTypes };
}
