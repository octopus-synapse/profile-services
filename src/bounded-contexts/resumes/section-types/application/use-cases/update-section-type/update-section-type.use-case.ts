import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SectionTypeResponseDto, UpdateSectionTypeDto } from '../../../dto';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';
import { toResponseDto } from '../../to-response-dto';

export class UpdateSectionTypeUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(key: string, dto: UpdateSectionTypeDto): Promise<SectionTypeResponseDto> {
    const existing = await this.repository.findByKey(key);

    if (!existing) {
      throw new NotFoundException(`Section type '${key}' not found`);
    }

    if (existing.isSystem) {
      const restrictedFields = ['key', 'semanticKind', 'definition'];
      const attemptedRestrictedUpdate = restrictedFields.some(
        (field) => field in dto && dto[field as keyof UpdateSectionTypeDto] !== undefined,
      );

      if (attemptedRestrictedUpdate) {
        throw new BadRequestException(
          'Cannot modify key, semanticKind, or definition of system section types',
        );
      }
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const existingSlug = await this.repository.findBySlugAndVersion(
        dto.slug,
        existing.version,
        existing.id,
      );

      if (existingSlug) {
        throw new ConflictException(
          `Section type with slug '${dto.slug}' and version ${existing.version} already exists`,
        );
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
      definition: dto.definition as Prisma.InputJsonValue | undefined,
      uiSchema:
        dto.uiSchema === null
          ? Prisma.JsonNull
          : (dto.uiSchema as Prisma.InputJsonValue | undefined),
      renderHints: dto.renderHints as Prisma.InputJsonValue | undefined,
      fieldStyles: dto.fieldStyles as Prisma.InputJsonValue | undefined,
      iconType: dto.iconType,
      icon: dto.icon,
      translations: mergedTranslations as Prisma.InputJsonValue | undefined,
    });

    return toResponseDto(sectionType);
  }
}
