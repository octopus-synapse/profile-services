import { Injectable } from '@nestjs/common';
import { Prisma, TechAreaType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import {
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';

@Injectable()
export class AdminTechAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const where: Prisma.TechAreaWhereInput = {};

    if (query.search) {
      where.OR = searchWhere(query.search, ['nameEn', 'namePtBr']);
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return paginate(this.prisma.techArea, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.techArea.findUnique({ where: { id } });
    if (!item) throw new EntityNotFoundException('TechArea', id);
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
    if (!existing) throw new EntityNotFoundException('TechArea', id);

    const data = patchData(dto, [
      'nameEn',
      'namePtBr',
      'descriptionEn',
      'descriptionPtBr',
      'icon',
      'color',
      'order',
      'isActive',
    ]);

    return this.prisma.techArea.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.techArea.findUnique({ where: { id } });
    if (!existing) throw new EntityNotFoundException('TechArea', id);

    const childCount = await this.prisma.techNiche.count({ where: { areaId: id } });
    if (childCount > 0) {
      throw new ValidationException(
        `Cannot delete tech area - it has ${childCount} niche(s). Remove them first.`,
      );
    }

    await this.prisma.techArea.delete({ where: { id } });
  }
}
