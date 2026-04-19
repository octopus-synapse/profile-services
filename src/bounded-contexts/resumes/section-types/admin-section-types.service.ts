import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate, searchWhere } from '@/shared-kernel/database';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  CreateSectionTypeDto,
  ListSectionTypesQueryDto,
  SectionTypeListResponseDto,
  SectionTypeResponseDto,
  UpdateSectionTypeDto,
} from './dto';

@Injectable()
export class AdminSectionTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List section types with pagination and filters
   */
  async findAll(query: ListSectionTypesQueryDto): Promise<SectionTypeListResponseDto> {
    const { search, isActive, semanticKind } = query;
    const where: Prisma.SectionTypeWhereInput = {};

    if (search) {
      where.OR = searchWhere(search, ['key', 'title', 'slug']);
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (semanticKind) {
      where.semanticKind = semanticKind;
    }

    const result = await paginate(this.prisma.sectionType, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...result,
      items: result.items.map(this.toResponseDto),
    };
  }

  /**
   * Get a single section type by key
   */
  async findOne(key: string): Promise<SectionTypeResponseDto> {
    const sectionType = await this.prisma.sectionType.findUnique({
      where: { key },
    });

    if (!sectionType) {
      throw new EntityNotFoundException('SectionType', key);
    }

    return this.toResponseDto(sectionType);
  }

  /**
   * Create a new section type
   */
  async create(dto: CreateSectionTypeDto): Promise<SectionTypeResponseDto> {
    // Check if key already exists
    const existing = await this.prisma.sectionType.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      throw new ConflictException(`Section type '${dto.key}' already exists`);
    }

    // Check slug + version uniqueness
    const existingSlug = await this.prisma.sectionType.findFirst({
      where: { slug: dto.slug, version: dto.version },
    });

    if (existingSlug) {
      throw new ConflictException(
        `Section type with slug '${dto.slug}' and version ${dto.version} already exists`,
      );
    }

    const sectionType = await this.prisma.sectionType.create({
      data: {
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
        isSystem: false, // User-created types are not system types
        isActive: true,
      },
    });

    return this.toResponseDto(sectionType);
  }

  /**
   * Update an existing section type
   */
  async update(key: string, dto: UpdateSectionTypeDto): Promise<SectionTypeResponseDto> {
    const existing = await this.prisma.sectionType.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new EntityNotFoundException('SectionType', key);
    }

    // For system types, restrict which fields can be updated
    if (existing.isSystem) {
      const restrictedFields = ['key', 'semanticKind', 'definition'];
      const attemptedRestrictedUpdate = restrictedFields.some(
        (field) => field in dto && dto[field as keyof UpdateSectionTypeDto] !== undefined,
      );

      if (attemptedRestrictedUpdate) {
        throw new ValidationException(
          'Cannot modify key, semanticKind, or definition of system section types',
        );
      }
    }

    // Check slug + version uniqueness if changing slug
    if (dto.slug && dto.slug !== existing.slug) {
      const existingSlug = await this.prisma.sectionType.findFirst({
        where: {
          slug: dto.slug,
          version: existing.version,
          id: { not: existing.id },
        },
      });

      if (existingSlug) {
        throw new ConflictException(
          `Section type with slug '${dto.slug}' and version ${existing.version} already exists`,
        );
      }
    }

    // Merge translations: deep merge existing translations with new ones
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

    const sectionType = await this.prisma.sectionType.update({
      where: { key },
      data: {
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
      },
    });

    return this.toResponseDto(sectionType);
  }

  /**
   * Soft delete a section type (set isActive = false)
   * System types cannot be deleted
   */
  async remove(key: string): Promise<void> {
    const existing = await this.prisma.sectionType.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new EntityNotFoundException('SectionType', key);
    }

    if (existing.isSystem) {
      throw new ValidationException('Cannot delete system section types');
    }

    // Check if any resumes are using this section type
    const usageCount = await this.prisma.resumeSection.count({
      where: { sectionTypeId: existing.id },
    });

    if (usageCount > 0) {
      throw new ValidationException(
        `Cannot delete section type '${key}' - it is used by ${usageCount} resume(s). ` +
          'Deactivate it instead.',
      );
    }

    // Hard delete if not used
    await this.prisma.sectionType.delete({
      where: { key },
    });
  }

  /**
   * Get all unique semantic kinds
   */
  async getSemanticKinds(): Promise<string[]> {
    const result = await this.prisma.sectionType.findMany({
      select: { semanticKind: true },
      distinct: ['semanticKind'],
      orderBy: { semanticKind: 'asc' },
    });

    return result.map((r) => r.semanticKind);
  }

  /**
   * Convert database model to response DTO
   */
  private toResponseDto(sectionType: Prisma.SectionTypeGetPayload<object>): SectionTypeResponseDto {
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
}
