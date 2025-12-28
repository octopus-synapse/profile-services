/**
 * Theme Query Service
 * Handles theme listing, searching, and filtering
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, Prisma } from '@prisma/client';
import { QueryThemesDto } from '../dto';

@Injectable()
export class ThemeQueryService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryThemesDto, userId?: string) {
    const where = this.buildWhereClause(query, userId);
    const {
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const [data, total] = await Promise.all([
      this.prisma.resumeTheme.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, name: true, username: true } },
          _count: { select: { resumes: true, forks: true } },
        },
      }),
      this.prisma.resumeTheme.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId?: string) {
    const theme = await this.prisma.resumeTheme.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { resumes: true, forks: true } },
      },
    });

    if (!theme) return null;
    if (theme.status !== ThemeStatus.PUBLISHED && theme.authorId !== userId) {
      return null;
    }

    return theme;
  }

  async getPopular(limit = 10) {
    return this.prisma.resumeTheme.findMany({
      where: { status: ThemeStatus.PUBLISHED },
      orderBy: [{ usageCount: 'desc' }, { rating: 'desc' }],
      take: limit,
      include: { author: { select: { id: true, name: true, username: true } } },
    });
  }

  async getSystemThemes() {
    return this.prisma.resumeTheme.findMany({
      where: { isSystemTheme: true },
      orderBy: { name: 'asc' },
    });
  }

  async getMyThemes(userId: string) {
    return this.prisma.resumeTheme.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private buildWhereClause(
    query: QueryThemesDto,
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
