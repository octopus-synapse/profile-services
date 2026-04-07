import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  AdminSectionTypesRepositoryPort,
  type SectionTypeRecord,
} from '../../application/ports/admin-section-types.port';

export class AdminSectionTypesRepository extends AdminSectionTypesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findMany(
    where: Prisma.SectionTypeWhereInput,
    skip: number,
    take: number,
  ): Promise<SectionTypeRecord[]> {
    return this.prisma.sectionType.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where: Prisma.SectionTypeWhereInput): Promise<number> {
    return this.prisma.sectionType.count({ where });
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

  async create(data: Prisma.SectionTypeCreateInput): Promise<SectionTypeRecord> {
    return this.prisma.sectionType.create({ data });
  }

  async update(key: string, data: Prisma.SectionTypeUpdateInput): Promise<SectionTypeRecord> {
    return this.prisma.sectionType.update({ where: { key }, data });
  }

  async delete(key: string): Promise<void> {
    await this.prisma.sectionType.delete({ where: { key } });
  }

  async countResumeSectionsForType(sectionTypeId: string): Promise<number> {
    return this.prisma.resumeSection.count({
      where: { sectionTypeId },
    });
  }

  async findDistinctSemanticKinds(): Promise<string[]> {
    const result = await this.prisma.sectionType.findMany({
      select: { semanticKind: true },
      distinct: ['semanticKind'],
      orderBy: { semanticKind: 'asc' },
    });
    return result.map((r) => r.semanticKind);
  }
}
