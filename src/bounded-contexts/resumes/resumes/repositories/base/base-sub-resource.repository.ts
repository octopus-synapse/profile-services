import { Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  buildOrderByClause,
  type FindAllFilters,
  type OrderByConfig,
  type PrismaDelegate,
} from '@/bounded-contexts/resumes/infrastructure/repositories';
import type { PaginatedResult } from '@/shared-kernel';
import { PAGINATION } from '@/shared-kernel';
import { ISubResourceRepository } from '../../interfaces/base-sub-resource.interface';

export type { OrderByConfig, FindAllFilters };

export abstract class BaseSubResourceRepository<T, Create, Update>
  implements ISubResourceRepository<T, Create, Update>
{
  protected abstract readonly logger: Logger;

  constructor(protected readonly prisma: PrismaService) {}

  protected abstract getPrismaDelegate(): PrismaDelegate<T>;
  protected abstract getOrderByConfig(): OrderByConfig;
  protected abstract mapCreate(
    resumeId: string,
    dto: Create,
    order: number,
  ): Record<string, unknown>;
  protected abstract mapUpdate(dto: Update): Record<string, unknown>;

  protected getFindAllFilters(): FindAllFilters {
    return {};
  }

  protected getMaxOrderScope(_dto?: Create): Record<string, unknown> {
    return {};
  }

  async findEntityByIdAndResumeId(entityId: string, resumeId: string): Promise<T | null> {
    return this.getPrismaDelegate().findFirst({
      where: { id: entityId, resumeId },
    });
  }

  async reorderEntitiesForResume(_resumeId: string, entityIds: string[]): Promise<void> {
    const delegate = this.getPrismaDelegate();
    await this.prisma.$transaction(async () => {
      for (let index = 0; index < entityIds.length; index++) {
        await delegate.update({
          where: { id: entityIds[index] },
          data: { order: index },
        });
      }
    });
  }

  protected async getMaxOrder(resumeId: string, dto?: Create): Promise<number> {
    const result = (await this.getPrismaDelegate().aggregate({
      where: { resumeId, ...this.getMaxOrderScope(dto) },
      _max: { order: true },
    })) as { _max: { order: number | null } };

    return result._max.order ?? -1;
  }

  async findAllEntitiesForResume(
    resumeId: string,
    page: number = PAGINATION.DEFAULT_PAGE,
    limit: number = PAGINATION.DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * limit;
    const delegate = this.getPrismaDelegate();
    const orderBy = buildOrderByClause(this.getOrderByConfig());
    const where = { resumeId, ...this.getFindAllFilters() };

    const [data, total] = await Promise.all([
      delegate.findMany({ where, orderBy, skip, take: limit }),
      delegate.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async deleteEntityForResume(entityId: string, resumeId: string): Promise<boolean> {
    const result = await this.getPrismaDelegate().deleteMany({
      where: { id: entityId, resumeId },
    });
    return result.count > 0;
  }

  async updateEntityForResume(
    entityId: string,
    resumeId: string,
    updateData: Update,
  ): Promise<T | null> {
    const delegate = this.getPrismaDelegate();
    const result = await delegate.updateMany({
      where: { id: entityId, resumeId },
      data: this.mapUpdate(updateData),
    });

    if (result.count === 0) return null;

    return delegate.findUnique({ where: { id: entityId } });
  }

  async createEntityForResume(resumeId: string, entityData: Create): Promise<T> {
    const maxOrder = await this.getMaxOrder(resumeId, entityData);
    return this.getPrismaDelegate().create({
      data: this.mapCreate(resumeId, entityData, maxOrder + 1),
    });
  }
}
