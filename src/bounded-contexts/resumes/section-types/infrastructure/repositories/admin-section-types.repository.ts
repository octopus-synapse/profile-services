import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { searchWhere } from '@/shared-kernel/database';
import {
  AdminSectionTypesRepositoryPort,
  type CreateSectionTypeData,
  type SectionTypeFilter,
  type SectionTypeRecord,
  type UpdateSectionTypeData,
} from '../../application/ports/admin-section-types.port';

export class AdminSectionTypesRepository extends AdminSectionTypesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findMany(
    filter: SectionTypeFilter,
    skip: number,
    take: number,
  ): Promise<SectionTypeRecord[]> {
    return this.prisma.sectionType.findMany({
      where: this.buildPrismaWhere(filter),
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(filter: SectionTypeFilter): Promise<number> {
    return this.prisma.sectionType.count({ where: this.buildPrismaWhere(filter) });
  }

  async findByKey(key: string): Promise<SectionTypeRecord | null> {
    return this.prisma.sectionType.findUnique({ where: { key } });
  }

  async findBySlugAndVersion(
    slug: string,
    version: number,
    excludeId?: string,
  ): Promise<SectionTypeRecord | null> {
    const where: Prisma.SectionTypeWhereInput = { slug, version };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return this.prisma.sectionType.findFirst({ where });
  }

  async create(data: CreateSectionTypeData): Promise<SectionTypeRecord> {
    return this.prisma.sectionType.create({
      data: data as Prisma.SectionTypeCreateInput,
    });
  }

  async update(key: string, data: UpdateSectionTypeData): Promise<SectionTypeRecord> {
    return this.prisma.sectionType.update({
      where: { key },
      data: data as Prisma.SectionTypeUpdateInput,
    });
  }

  async delete(key: string): Promise<void> {
    await this.prisma.sectionType.delete({ where: { key } });
  }

  async countResumeSectionsForType(sectionTypeId: string): Promise<number> {
    return this.prisma.resumeSection.count({ where: { sectionTypeId } });
  }

  async findDistinctSemanticKinds(): Promise<string[]> {
    const result = await this.prisma.sectionType.findMany({
      select: { semanticKind: true },
      distinct: ['semanticKind'],
      orderBy: { semanticKind: 'asc' },
    });
    return result.map((r) => r.semanticKind);
  }

  private buildPrismaWhere(filter: SectionTypeFilter): Prisma.SectionTypeWhereInput {
    const where: Prisma.SectionTypeWhereInput = {};

    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.semanticKind) where.semanticKind = filter.semanticKind;
    if (filter.search) {
      where.OR = searchWhere(filter.search, ['key', 'title', 'slug']);
    }

    return where;
  }
}
