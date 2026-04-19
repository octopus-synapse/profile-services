import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import {
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';

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
    const where: Prisma.TechNicheWhereInput = {};

    if (query.search) {
      where.OR = searchWhere(query.search, ['nameEn', 'namePtBr']);
    }
    if (query.areaId) where.areaId = query.areaId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return paginate(this.prisma.techNiche, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.techNiche.findUnique({ where: { id } });
    if (!item) throw new EntityNotFoundException('TechNiche', id);
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
    if (!existing) throw new EntityNotFoundException('TechNiche', id);

    const data = patchData(dto, [
      'slug',
      'nameEn',
      'namePtBr',
      'descriptionEn',
      'descriptionPtBr',
      'icon',
      'color',
      'order',
      'isActive',
      'areaId',
    ]);

    return this.prisma.techNiche.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.techNiche.findUnique({ where: { id } });
    if (!existing) throw new EntityNotFoundException('TechNiche', id);

    const childCount = await this.prisma.techSkill.count({ where: { nicheId: id } });
    if (childCount > 0) {
      throw new ValidationException(
        `Cannot delete tech niche - it has ${childCount} skill(s). Remove them first.`,
      );
    }

    await this.prisma.techNiche.delete({ where: { id } });
  }
}
