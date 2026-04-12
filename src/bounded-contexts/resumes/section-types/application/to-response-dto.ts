import type { SectionTypeResponseDto } from '../dto';
import type { SectionTypeRecord } from './ports/admin-section-types.port';

export function toResponseDto(sectionType: SectionTypeRecord): SectionTypeResponseDto {
  return {
    id: sectionType.id,
    key: sectionType.key,
    slug: sectionType.slug,
    title: sectionType.title,
    description: sectionType.description,
    semanticKind: sectionType.semanticKind,
    version: sectionType.version,
    isActive: sectionType.isActive,
    isSystem: sectionType.isSystem,
    isRepeatable: sectionType.isRepeatable,
    minItems: sectionType.minItems,
    maxItems: sectionType.maxItems,
    definition: sectionType.definition as Record<string, unknown>,
    uiSchema: sectionType.uiSchema as Record<string, unknown> | null,
    renderHints: (sectionType.renderHints ?? {}) as Record<string, unknown>,
    fieldStyles: (sectionType.fieldStyles ?? {}) as Record<string, Record<string, unknown>>,
    iconType: sectionType.iconType,
    icon: sectionType.icon,
    translations:
      (sectionType.translations as Record<
        string,
        {
          title: string;
          description?: string;
          label: string;
          noDataLabel: string;
          placeholder: string;
          addLabel: string;
        }
      >) ?? {},
    createdAt: sectionType.createdAt,
    updatedAt: sectionType.updatedAt,
  };
}
