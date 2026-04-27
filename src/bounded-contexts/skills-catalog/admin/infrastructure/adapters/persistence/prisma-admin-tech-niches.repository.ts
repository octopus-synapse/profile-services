import { Prisma, type TechNiche } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import {
  type AdminTechNichesListQuery,
  AdminTechNichesRepositoryPort,
} from '../../../domain/ports/admin-tech-niches.repository.port';

export class PrismaAdminTechNichesRepository extends AdminTechNichesRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findAll(query: AdminTechNichesListQuery) {
    const where: Prisma.TechNicheWhereInput = {};
    if (query.search) where.OR = searchWhere(query.search, ['nameEn', 'namePtBr']);
    if (query.areaId) where.areaId = query.areaId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return paginate<TechNiche>(this.prisma.techNiche, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.techNiche.findUnique({ where: { id } });
  }

  async create(input: Record<string, unknown>) {
    return this.prisma.techNiche.create({
      data: {
        slug: input.slug as string,
        nameEn: input.nameEn as string,
        namePtBr: input.namePtBr as string,
        descriptionEn: (input.descriptionEn as string) ?? null,
        descriptionPtBr: (input.descriptionPtBr as string) ?? null,
        icon: (input.icon as string) ?? null,
        color: (input.color as string) ?? null,
        order: (input.order as number) ?? 0,
        isActive: (input.isActive as boolean) ?? true,
        areaId: input.areaId as string,
      },
    });
  }

  async update(id: string, input: Record<string, unknown>) {
    return this.prisma.techNiche.update({
      where: { id },
      data: patchData(input, [
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
      ]),
    });
  }

  async delete(id: string) {
    await this.prisma.techNiche.delete({ where: { id } });
  }

  async countSkills(nicheId: string) {
    return this.prisma.techSkill.count({ where: { nicheId } });
  }
}
