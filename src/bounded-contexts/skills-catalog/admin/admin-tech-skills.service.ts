import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SkillType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

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
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.TechSkillWhereInput = {};

    if (query.search) {
      where.OR = [
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { namePtBr: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.nicheId) where.nicheId = query.nicheId;
    if (query.type) where.type = query.type as SkillType;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [items, total] = await Promise.all([
      this.prisma.techSkill.findMany({ where, skip, take: pageSize, orderBy: { order: 'asc' } }),
      this.prisma.techSkill.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const item = await this.prisma.techSkill.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Tech skill '${id}' not found`);
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
    if (!existing) throw new NotFoundException(`Tech skill '${id}' not found`);

    const data: Record<string, unknown> = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.namePtBr !== undefined) data.namePtBr = dto.namePtBr;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionPtBr !== undefined) data.descriptionPtBr = dto.descriptionPtBr;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.nicheId !== undefined) data.nicheId = dto.nicheId;
    if (dto.aliases !== undefined) data.aliases = dto.aliases;
    if (dto.keywords !== undefined) data.keywords = dto.keywords;
    if (dto.popularity !== undefined) data.popularity = dto.popularity;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.techSkill.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.techSkill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Tech skill '${id}' not found`);

    await this.prisma.techSkill.delete({ where: { id } });
  }
}
