import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TechAreaType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class AdminTechAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.TechAreaWhereInput = {};

    if (query.search) {
      where.OR = [
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { namePtBr: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [items, total] = await Promise.all([
      this.prisma.techArea.findMany({ where, skip, take: pageSize, orderBy: { order: 'asc' } }),
      this.prisma.techArea.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const item = await this.prisma.techArea.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Tech area '${id}' not found`);
    return item;
  }

  async create(dto: Record<string, unknown>) {
    return this.prisma.techArea.create({
      data: {
        type: dto.type as TechAreaType,
        nameEn: dto.nameEn as string,
        namePtBr: dto.namePtBr as string,
        descriptionEn: (dto.descriptionEn as string) ?? null,
        descriptionPtBr: (dto.descriptionPtBr as string) ?? null,
        icon: (dto.icon as string) ?? null,
        color: (dto.color as string) ?? null,
        order: (dto.order as number) ?? 0,
        isActive: (dto.isActive as boolean) ?? true,
      },
    });
  }

  async update(id: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.techArea.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Tech area '${id}' not found`);

    const data: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.namePtBr !== undefined) data.namePtBr = dto.namePtBr;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionPtBr !== undefined) data.descriptionPtBr = dto.descriptionPtBr;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.techArea.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.techArea.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Tech area '${id}' not found`);

    const childCount = await this.prisma.techNiche.count({ where: { areaId: id } });
    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete tech area - it has ${childCount} niche(s). Remove them first.`,
      );
    }

    await this.prisma.techArea.delete({ where: { id } });
  }
}
