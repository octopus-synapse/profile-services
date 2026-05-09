import type { SectionTypeRecord } from '../../application/ports/admin-section-types.port';
import type { SectionTypeResponseDto } from '../../dto';

/**
 * P2-095 — narrow Prisma's `JsonValue` to the typed shapes the DTO
 * carries. The `JsonValue` union is intentionally lossy at the DB
 * boundary; downstream code needs the structured shape. Wrapping
 * each cast in a single helper makes the assumption explicit (we
 * trust the seeded SectionType definitions to be well-shaped) and
 * gives a single point to plug in runtime validation later.
 */
function asJsonObject(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

interface SectionTypeTranslation {
  readonly title: string;
  readonly description?: string;
  readonly label: string;
  readonly noDataLabel: string;
  readonly placeholder: string;
  readonly addLabel: string;
}

function asTranslations(value: unknown): Record<string, SectionTypeTranslation> {
  return (value ?? {}) as Record<string, SectionTypeTranslation>;
}

export function toSectionTypeResponseDto(sectionType: SectionTypeRecord): SectionTypeResponseDto {
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
    definition: asJsonObject(sectionType.definition),
    uiSchema: sectionType.uiSchema === null ? null : asJsonObject(sectionType.uiSchema),
    renderHints: asJsonObject(sectionType.renderHints),
    fieldStyles: asJsonObject(sectionType.fieldStyles) as Record<string, Record<string, unknown>>,
    iconType: sectionType.iconType,
    icon: sectionType.icon,
    translations: asTranslations(sectionType.translations),
    createdAt: sectionType.createdAt,
    updatedAt: sectionType.updatedAt,
  };
}
