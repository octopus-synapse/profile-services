import { Prisma, SkillType, type TechSkill } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import {
  type AdminTechSkillsListQuery,
  AdminTechSkillsRepositoryPort,
} from '../../../domain/ports/admin-tech-skills.repository.port';

export class PrismaAdminTechSkillsRepository extends AdminTechSkillsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async listAll(query: AdminTechSkillsListQuery) {
    const where: Prisma.TechSkillWhereInput = {};
    if (query.search) where.OR = searchWhere(query.search, ['nameEn', 'namePtBr']);
    if (query.nicheId) where.nicheId = query.nicheId;
    if (query.type) where.type = query.type as SkillType;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return paginate<TechSkill>(this.prisma.techSkill, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.techSkill.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    return this.prisma.techSkill.findUnique({ where: { slug } });
  }

  async findByNameEn(nameEn: string) {
    return this.prisma.techSkill.findFirst({
      where: { nameEn: { equals: nameEn, mode: 'insensitive' } },
    });
  }

  async countResumeReferences(skill: {
    slug: string;
    nameEn: string;
    namePtBr: string;
  }): Promise<number> {
    // Skill catalog entries aren't FK-referenced by resume items —
    // section items store the skill name as plain text inside their
    // JSON content. We search across the three identifying strings to
    // cover both legacy (free-typed) and modern (auto-completed) entries.
    const candidates = [skill.slug, skill.nameEn, skill.namePtBr]
      .filter((s) => typeof s === 'string' && s.length > 0)
      .map((s) => s.toLowerCase());
    if (candidates.length === 0) return 0;

    let total = 0;
    for (const needle of candidates) {
      total += await this.prisma.sectionItem.count({
        where: {
          OR: [
            { content: { path: ['name'], string_contains: needle } },
            { content: { path: ['slug'], string_contains: needle } },
          ],
        },
      });
    }
    return total;
  }

  async create(input: Record<string, unknown>) {
    return this.prisma.techSkill.create({
      data: {
        slug: input.slug as string,
        nameEn: input.nameEn as string,
        namePtBr: input.namePtBr as string,
        descriptionEn: (input.descriptionEn as string) ?? null,
        descriptionPtBr: (input.descriptionPtBr as string) ?? null,
        type: (input.type as SkillType) ?? SkillType.OTHER,
        icon: (input.icon as string) ?? null,
        color: (input.color as string) ?? null,
        website: (input.website as string) ?? null,
        nicheId: (input.nicheId as string) ?? null,
        aliases: (input.aliases as string[]) ?? [],
        keywords: (input.keywords as string[]) ?? [],
        popularity: (input.popularity as number) ?? 0,
        order: (input.order as number) ?? 0,
        isActive: (input.isActive as boolean) ?? true,
      },
    });
  }

  async update(id: string, input: Record<string, unknown>) {
    return this.prisma.techSkill.update({
      where: { id },
      data: patchData(input, [
        'slug',
        'nameEn',
        'namePtBr',
        'descriptionEn',
        'descriptionPtBr',
        'type',
        'icon',
        'color',
        'website',
        'nicheId',
        'aliases',
        'keywords',
        'popularity',
        'order',
        'isActive',
      ]),
    });
  }

  async delete(id: string) {
    await this.prisma.techSkill.delete({ where: { id } });
  }
}
