import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class AdminTechNichesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    areaId?: string;
    isActive?: boolean;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.TechNicheWhereInput = {};

    if (query.search) {
      where.OR = [
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { namePtBr: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.areaId) where.areaId = query.areaId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [items, total] = await Promise.all([
      this.prisma.techNiche.findMany({ where, skip, take: pageSize, orderBy: { order: 'asc' } }),
      this.prisma.techNiche.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const item = await this.prisma.techNiche.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Tech niche '${id}' not found`);
    return item;
  }

  async create(dto: Record<string, unknown>) {
    return this.prisma.techNiche.create({
      data: {
        slug: dto.slug as string,
        nameEn: dto.nameEn as string,
        namePtBr: dto.namePtBr as string,
        descriptionEn: (dto.descriptionEn as string) ?? null,
        descriptionPtBr: (dto.descriptionPtBr as string) ?? null,
        icon: (dto.icon as string) ?? null,
        color: (dto.color as string) ?? null,
        order: (dto.order as number) ?? 0,
        isActive: (dto.isActive as boolean) ?? true,
        areaId: dto.areaId as string,
      },
    });
  }

  async update(id: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.techNiche.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Tech niche '${id}' not found`);

    const data: Record<string, unknown> = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.namePtBr !== undefined) data.namePtBr = dto.namePtBr;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionPtBr !== undefined) data.descriptionPtBr = dto.descriptionPtBr;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.areaId !== undefined) data.areaId = dto.areaId;

    return this.prisma.techNiche.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.techNiche.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Tech niche '${id}' not found`);

    const childCount = await this.prisma.techSkill.count({ where: { nicheId: id } });
    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete tech niche - it has ${childCount} skill(s). Remove them first.`,
      );
    }

    await this.prisma.techNiche.delete({ where: { id } });
  }
}
