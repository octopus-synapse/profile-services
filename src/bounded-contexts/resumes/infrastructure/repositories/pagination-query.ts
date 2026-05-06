import type { PaginatedResult } from '@/shared-kernel';
import { PAGINATION } from '@/shared-kernel';
import type { FindAllFilters, OrderByConfig } from './order-by-config';
import { buildOrderByClause } from './order-by-config';
import type { PrismaDelegate } from './prisma-delegate.type';

export async function listWithPagination<T>(
  delegate: PrismaDelegate<T>,
  resumeId: string,
  orderConfig: OrderByConfig,
  filters: FindAllFilters,
  page: number = PAGINATION.DEFAULT_PAGE,
  limit: number = PAGINATION.DEFAULT_PAGE_SIZE,
): Promise<PaginatedResult<T>> {
  const skip = (page - 1) * limit;
  const orderBy = buildOrderByClause(orderConfig);
  const where = { resumeId, ...filters };

  const [items, total] = await Promise.all([
    delegate.findMany({ where, orderBy, skip, take: limit }),
    delegate.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}
