/**
 * List Themes Use Case
 *
 * All themes are public. No visibility filtering needed.
 */

import type { QueryThemes } from '@/shared-kernel';
import { APP_CONFIG } from '@/shared-kernel';
import type { ThemeFilter, ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

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

  async execute(queryOptions: QueryThemes): Promise<ThemePaginatedResult> {
    const filter = this.buildFilter(queryOptions);
    const {
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      limit = APP_CONFIG.DEFAULT_PAGE_SIZE,
    } = queryOptions;

    const result = await this.themeRepo.findManyWithPagination({
      filter,
      sortBy,
      sortDir,
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

  private buildFilter(query: QueryThemes): ThemeFilter {
    const filter: ThemeFilter = {};

    if (query.category) filter.category = query.category;
    if (query.systemOnly) filter.isSystemTheme = true;
    if (query.authorId) filter.authorId = query.authorId;
    if (query.search) filter.search = query.search;

    return filter;
  }
}
