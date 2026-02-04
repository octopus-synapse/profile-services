import type { PrismaDelegate } from './prisma-delegate.type';
import type { OrderByConfig, FindAllFilters } from './order-by-config';
import { buildOrderByClause } from './order-by-config';
import type { PaginatedResult } from '@octopus-synapse/profile-contracts';
import { PAGINATION } from '@octopus-synapse/profile-contracts';

export async function findAllWithPagination<T>(
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
