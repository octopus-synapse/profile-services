/**
 * List Themes Use Case
 */

import { Prisma, ThemeStatus } from '@prisma/client';
import type { QueryThemes } from '@/shared-kernel';
import { APP_CONFIG } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export type ThemePagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ThemePaginatedResult<TTheme = unknown> = {
  themes: TTheme[];
  pagination: ThemePagination;
};

export class ListThemesUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(queryOptions: QueryThemes, userId?: string): Promise<ThemePaginatedResult> {
    const whereClause = this.buildWhereClause(queryOptions, userId);
    const {
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      limit = APP_CONFIG.DEFAULT_PAGE_SIZE,
    } = queryOptions;

    const result = await this.themeRepo.findManyWithPagination({
      where: whereClause,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      themes: result.themes,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  private buildWhereClause(query: QueryThemes, userId?: string): Prisma.ResumeThemeWhereInput {
    const where: Prisma.ResumeThemeWhereInput = {};

    if (query.status) where.status = query.status;
    else if (!userId) where.status = ThemeStatus.PUBLISHED;

    if (query.category) where.category = query.category;
    if (query.systemOnly) where.isSystemTheme = true;
    if (query.authorId) where.authorId = query.authorId;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
