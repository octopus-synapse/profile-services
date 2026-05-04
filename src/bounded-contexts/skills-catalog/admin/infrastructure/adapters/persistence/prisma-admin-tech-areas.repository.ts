/**
 * Prisma adapter for `AdminTechAreasRepositoryPort`. Owns the
 * search-where + patch-projection helpers and the Prisma row shape.
 */

import { Prisma, type TechArea, TechAreaType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import {
  type AdminTechAreasListQuery,
  AdminTechAreasRepositoryPort,
} from '../../../domain/ports/admin-tech-areas.repository.port';

export class PrismaAdminTechAreasRepository extends AdminTechAreasRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async listAll(query: AdminTechAreasListQuery) {
    const where: Prisma.TechAreaWhereInput = {};
    if (query.search) where.OR = searchWhere(query.search, ['nameEn', 'namePtBr']);
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return paginate<TechArea>(this.prisma.techArea, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.techArea.findUnique({ where: { id } });
  }

  async create(input: Record<string, unknown>) {
    return this.prisma.techArea.create({
      data: {
        type: input.type as TechAreaType,
        nameEn: input.nameEn as string,
        namePtBr: input.namePtBr as string,
        descriptionEn: (input.descriptionEn as string) ?? null,
        descriptionPtBr: (input.descriptionPtBr as string) ?? null,
        icon: (input.icon as string) ?? null,
        color: (input.color as string) ?? null,
        order: (input.order as number) ?? 0,
        isActive: (input.isActive as boolean) ?? true,
      },
    });
  }

  async update(id: string, input: Record<string, unknown>) {
    return this.prisma.techArea.update({
      where: { id },
      data: patchData(input, [
        'nameEn',
        'namePtBr',
        'descriptionEn',
        'descriptionPtBr',
        'icon',
        'color',
        'order',
        'isActive',
      ]),
    });
  }

  async delete(id: string) {
    await this.prisma.techArea.delete({ where: { id } });
  }

  async countNiches(areaId: string) {
    return this.prisma.techNiche.count({ where: { areaId } });
  }
}
