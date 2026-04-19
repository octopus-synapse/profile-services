import { Injectable } from '@nestjs/common';
import { Prisma, SkillType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';

@Injectable()
export class AdminTechSkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    nicheId?: string;
    type?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.TechSkillWhereInput = {};

    if (query.search) {
      where.OR = searchWhere(query.search, ['nameEn', 'namePtBr']);
    }
    if (query.nicheId) where.nicheId = query.nicheId;
    if (query.type) where.type = query.type as SkillType;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return paginate(this.prisma.techSkill, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.techSkill.findUnique({ where: { id } });
    if (!item) throw new EntityNotFoundException('TechSkill', id);
    return item;
  }

  async create(dto: Record<string, unknown>) {
    return this.prisma.techSkill.create({
      data: {
        slug: dto.slug as string,
        nameEn: dto.nameEn as string,
        namePtBr: dto.namePtBr as string,
        descriptionEn: (dto.descriptionEn as string) ?? null,
        descriptionPtBr: (dto.descriptionPtBr as string) ?? null,
        type: (dto.type as SkillType) ?? SkillType.OTHER,
        icon: (dto.icon as string) ?? null,
        color: (dto.color as string) ?? null,
        website: (dto.website as string) ?? null,
        nicheId: (dto.nicheId as string) ?? null,
        aliases: (dto.aliases as string[]) ?? [],
        keywords: (dto.keywords as string[]) ?? [],
        popularity: (dto.popularity as number) ?? 0,
        order: (dto.order as number) ?? 0,
        isActive: (dto.isActive as boolean) ?? true,
      },
    });
  }

  async update(id: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.techSkill.findUnique({ where: { id } });
    if (!existing) throw new EntityNotFoundException('TechSkill', id);

    const data = patchData(dto, [
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
    ]);

    return this.prisma.techSkill.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.techSkill.findUnique({ where: { id } });
    if (!existing) throw new EntityNotFoundException('TechSkill', id);

    await this.prisma.techSkill.delete({ where: { id } });
  }
}
