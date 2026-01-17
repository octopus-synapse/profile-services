/**
 * Theme Query Service
 * Handles theme listing, searching, and filtering
 */

import { Injectable } from '@nestjs/common';
import { ThemeStatus, Prisma } from '@prisma/client';
import type { QueryThemes } from '@octopus-synapse/profile-contracts';
import { APP_CONFIG } from '@octopus-synapse/profile-contracts';
import { ThemeRepository } from '../repositories';

@Injectable()
export class ThemeQueryService {
  constructor(private readonly themeRepository: ThemeRepository) {}

  async findAllThemesWithPagination(
    queryOptions: QueryThemes,
    userId?: string,
  ) {
    const whereClause = this.buildWhereClause(queryOptions, userId);
    const {
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      limit = APP_CONFIG.DEFAULT_PAGE_SIZE,
    } = queryOptions;

    const [paginatedThemes, totalThemeCount] = await Promise.all([
      this.themeRepository.findManyWithPagination({
        where: whereClause,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.themeRepository.count(whereClause),
    ]);

    const paginationMetadata = {
      total: totalThemeCount,
      page,
      limit,
      totalPages: Math.ceil(totalThemeCount / limit),
    };

    return {
      data: paginatedThemes,
      meta: paginationMetadata,
    };
  }

  async findThemeById(themeId: string, userId?: string) {
    const foundTheme = await this.themeRepository.findByIdWithAuthor(themeId);

    if (!foundTheme) return null;
    if (
      foundTheme.status !== ThemeStatus.PUBLISHED &&
      foundTheme.authorId !== userId
    ) {
      return null;
    }

    return foundTheme;
  }

  async findPopularThemes(
    limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
  ) {
    return this.themeRepository.findPopular(limit);
  }

  async findAllSystemThemes() {
    return this.themeRepository.findSystemThemes();
  }

  async findAllThemesByUser(userId: string) {
    return this.themeRepository.findByAuthor(userId);
  }

  private buildWhereClause(
    query: QueryThemes,
    userId?: string,
  ): Prisma.ResumeThemeWhereInput {
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
