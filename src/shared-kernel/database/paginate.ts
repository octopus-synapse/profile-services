/**
 * Generic pagination helper.
 *
 * Replaces the copy-pasted pagination pattern found in 10+ services:
 *   const page = query.page ?? 1;
 *   const pageSize = query.pageSize ?? 20;
 *   const skip = (page - 1) * pageSize;
 *   const [items, total] = await Promise.all([...findMany, ...count]);
 *   return { items, total, page, pageSize, totalPages };
 *
 * Usage:
 *   return paginate(this.prisma.techArea, { page, pageSize, where, orderBy });
 */

interface PaginateOptions<TWhere, TOrderBy> {
  page?: number;
  pageSize?: number;
  where?: TWhere;
  orderBy?: TOrderBy;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PrismaDelegate {
  findMany(args?: unknown): Promise<unknown[]>;
  count(args?: unknown): Promise<number>;
}

export async function paginate<T, TWhere = unknown, TOrderBy = unknown>(
  delegate: PrismaDelegate,
  options: PaginateOptions<TWhere, TOrderBy>,
): Promise<PaginatedResult<T>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const findArgs: Record<string, unknown> = {
    where: options.where,
    skip,
    take: pageSize,
  };

  if (options.orderBy) findArgs.orderBy = options.orderBy;
  if (options.include) findArgs.include = options.include;
  if (options.select) findArgs.select = options.select;

  const [items, total] = await Promise.all([
    delegate.findMany(findArgs),
    delegate.count({ where: options.where }),
  ]);

  return {
    items: items as T[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
