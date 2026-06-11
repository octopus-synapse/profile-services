import { resolveSectionTypeForLocale } from '@/shared-kernel/utils/locale-resolver.util';
import type { ResumeSectionTypesDataDto } from '../dto/generic-sections-response.schema';

type SectionTypeLike = Parameters<typeof resolveSectionTypeForLocale>[0];

/**
 * A section type is mandatory when the seed's ATS metadata says so
 * (`definition.ats.isMandatory`) or when the type requires at least one
 * item (`minItems`). Derived here instead of a dedicated column so the
 * knob stays in the seed — the app shows mandatory sections even when
 * empty ("ainda não tenho" state) and hides empty optional ones.
 */
function isMandatorySectionType(definition: unknown, minItems: number | null | undefined): boolean {
  const ats = (definition as { ats?: { isMandatory?: unknown } } | null | undefined)?.ats;
  return ats?.isMandatory === true || (minItems ?? 0) > 0;
}

export function toResumeSectionTypesData(
  rawSectionTypes: SectionTypeLike[],
  locale: Parameters<typeof resolveSectionTypeForLocale>[1],
): ResumeSectionTypesDataDto {
  const sectionTypes: ResumeSectionTypesDataDto['sectionTypes'] = [];
  for (const st of rawSectionTypes) {
    const resolved = resolveSectionTypeForLocale(st, locale);
    sectionTypes.push({
      ...resolved,
      isMandatory: isMandatorySectionType(resolved.definition, resolved.minItems),
      definition: (resolved.definition ?? {}) as Record<string, unknown>,
      uiSchema: (resolved.uiSchema as Record<string, unknown>) ?? null,
      renderHints: (resolved.renderHints ?? {}) as Record<string, unknown>,
      fieldStyles: (resolved.fieldStyles ?? {}) as Record<string, unknown>,
    });
  }
  return { sectionTypes };
}
