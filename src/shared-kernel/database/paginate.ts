/**
 * Generic Prisma-backed pagination helper.
 *
 * Returns the canonical `PaginatedResponse<T>` shape from
 * `shared-kernel/schemas/common/api.types.ts` so use-cases pass it
 * through without remapping.
 *
 * Usage:
 *   return paginate(this.prisma.techArea, { page, limit, where, orderBy });
 */

import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';

interface PaginateOptions<TWhere, TOrderBy> {
  page?: number;
  /** Page size. `pageSize` accepted as alias for backwards compatibility. */
  limit?: number;
  /** @deprecated use `limit`. */
  pageSize?: number;
  where?: TWhere;
  orderBy?: TOrderBy;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

interface PrismaDelegate {
  findMany(args?: unknown): Promise<unknown[]>;
  count(args?: unknown): Promise<number>;
}

export async function paginate<T, TWhere = unknown, TOrderBy = unknown>(
  delegate: PrismaDelegate,
  options: PaginateOptions<TWhere, TOrderBy>,
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const limit = Math.max(1, Math.floor(options.limit ?? options.pageSize ?? 20));
  const skip = (page - 1) * limit;

  const findArgs: Record<string, unknown> = { where: options.where, skip, take: limit };

  if (options.orderBy) findArgs.orderBy = options.orderBy;
  if (options.include) findArgs.include = options.include;
  if (options.select) findArgs.select = options.select;

  const [items, total] = await Promise.all([
    delegate.findMany(findArgs),
    delegate.count({ where: options.where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    items: items as T[],
    total,
    page,
    limit,
    totalPages,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}
