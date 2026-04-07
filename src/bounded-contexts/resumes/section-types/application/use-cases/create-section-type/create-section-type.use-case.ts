import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateSectionTypeDto, SectionTypeResponseDto } from '../../../dto';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';
import { toResponseDto } from '../../to-response-dto';

export class CreateSectionTypeUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(dto: CreateSectionTypeDto): Promise<SectionTypeResponseDto> {
    const existing = await this.repository.findByKey(dto.key);
    if (existing) {
      throw new ConflictException(`Section type '${dto.key}' already exists`);
    }

    const existingSlug = await this.repository.findBySlugAndVersion(dto.slug, dto.version);
    if (existingSlug) {
      throw new ConflictException(
        `Section type with slug '${dto.slug}' and version ${dto.version} already exists`,
      );
    }

    const sectionType = await this.repository.create({
      key: dto.key,
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      semanticKind: dto.semanticKind,
      version: dto.version,
      isRepeatable: dto.isRepeatable,
      minItems: dto.minItems,
      maxItems: dto.maxItems,
      definition: dto.definition as Prisma.InputJsonValue,
      uiSchema: dto.uiSchema as Prisma.InputJsonValue | undefined,
      renderHints: dto.renderHints as Prisma.InputJsonValue | undefined,
      fieldStyles: dto.fieldStyles as Prisma.InputJsonValue | undefined,
      iconType: dto.iconType,
      icon: dto.icon,
      translations: dto.translations as Prisma.InputJsonValue,
      isSystem: false,
      isActive: true,
    });

    return toResponseDto(sectionType);
  }
}
