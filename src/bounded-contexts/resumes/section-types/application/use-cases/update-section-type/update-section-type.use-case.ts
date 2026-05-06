import {
  SectionTypeSlugVersionTakenException,
  SystemSectionTypeImmutableException,
} from '@/bounded-contexts/resumes/domain/exceptions';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { SectionTypeResponseDto, UpdateSectionTypeDto } from '../../../dto';
import type { JsonValue } from '../../ports/admin-section-types.port';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';
import { toSectionTypeResponseDto } from '../../../infrastructure/presenters/section-type.presenter';

export class UpdateSectionTypeUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(key: string, dto: UpdateSectionTypeDto): Promise<SectionTypeResponseDto> {
    const existing = await this.repository.findByKey(key);

    if (!existing) {
      throw new EntityNotFoundException('SectionType', key);
    }

    if (existing.isSystem) {
      const restrictedFields = ['key', 'semanticKind', 'definition'];
      const attemptedRestrictedUpdate = restrictedFields.some(
        (field) => field in dto && dto[field as keyof UpdateSectionTypeDto] !== undefined,
      );

      if (attemptedRestrictedUpdate) {
        throw new SystemSectionTypeImmutableException();
      }
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const existingSlug = await this.repository.findBySlugAndVersion(
        dto.slug,
        existing.version,
        existing.id,
      );

      if (existingSlug) {
        throw new SectionTypeSlugVersionTakenException(dto.slug, existing.version);
      }
    }

    let mergedTranslations = existing.translations as Record<string, unknown> | null;
    if (dto.translations) {
      const existingTranslations =
        (existing.translations as Record<string, Record<string, unknown>>) ?? {};
      const newTranslations = dto.translations as Record<string, Record<string, unknown>>;

      mergedTranslations = { ...existingTranslations };
      for (const locale of Object.keys(newTranslations)) {
        mergedTranslations[locale] = {
          ...(existingTranslations[locale] ?? {}),
          ...newTranslations[locale],
        };
      }
    }

    const sectionType = await this.repository.update(key, {
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      isActive: dto.isActive,
      isRepeatable: dto.isRepeatable,
      minItems: dto.minItems,
      maxItems: dto.maxItems,
      definition: dto.definition as JsonValue | undefined,
      uiSchema: dto.uiSchema === null ? null : (dto.uiSchema as JsonValue | undefined),
      renderHints: dto.renderHints as JsonValue | undefined,
      fieldStyles: dto.fieldStyles as JsonValue | undefined,
      iconType: dto.iconType,
      icon: dto.icon,
      translations: mergedTranslations as JsonValue | undefined,
    });

    return toSectionTypeResponseDto(sectionType);
  }
}
