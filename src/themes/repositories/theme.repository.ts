/**
 * Theme Repository
 * Low-level persistence operations for ResumeTheme entity
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, ThemeCategory, Prisma } from '@prisma/client';

export interface ThemeFindManyOptions {
  where: Prisma.ResumeThemeWhereInput;
  orderBy: Prisma.ResumeThemeOrderByWithRelationInput;
  skip: number;
  take: number;
}

export interface ThemeCreateData {
  name: string;
  description?: string;
  category?: ThemeCategory;
  tags: string[];
  styleConfig: Prisma.InputJsonValue;
  parentThemeId?: string;
  authorId: string;
  status: ThemeStatus;
  approvedById?: string;
  approvedAt?: Date;
  publishedAt?: Date;
}

export type ThemeUpdateData = Prisma.ResumeThemeUncheckedUpdateInput;

const AUTHOR_SELECT = { id: true, name: true, username: true } as const;
const AUTHOR_WITH_EMAIL_SELECT = { id: true, name: true, email: true } as const;
const COUNTS_SELECT = { resumes: true, forks: true } as const;

@Injectable()
export class ThemeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.resumeTheme.findUnique({
      where: { id },
    });
  }

  async findByIdWithAuthor(id: string) {
    return this.prisma.resumeTheme.findUnique({
      where: { id },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: COUNTS_SELECT },
      },
    });
  }

  async findManyWithPagination(options: ThemeFindManyOptions) {
    return this.prisma.resumeTheme.findMany({
      where: options.where,
      orderBy: options.orderBy,
      skip: options.skip,
      take: options.take,
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: COUNTS_SELECT },
      },
    });
  }

  async count(where: Prisma.ResumeThemeWhereInput) {
    return this.prisma.resumeTheme.count({ where });
  }

  async findManyByStatus(
    status: ThemeStatus,
    orderBy: Prisma.ResumeThemeOrderByWithRelationInput = { createdAt: 'asc' },
  ) {
    return this.prisma.resumeTheme.findMany({
      where: { status },
      orderBy,
      include: { author: { select: AUTHOR_WITH_EMAIL_SELECT } },
    });
  }

  async findPopular(limit: number) {
    return this.prisma.resumeTheme.findMany({
      where: { status: ThemeStatus.PUBLISHED },
      orderBy: [{ usageCount: 'desc' }, { rating: 'desc' }],
      take: limit,
      include: { author: { select: AUTHOR_SELECT } },
    });
  }

  async findSystemThemes() {
    return this.prisma.resumeTheme.findMany({
      where: { isSystemTheme: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByAuthor(authorId: string) {
    return this.prisma.resumeTheme.findMany({
      where: { authorId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countByAuthor(authorId: string) {
    return this.prisma.resumeTheme.count({
      where: { authorId },
    });
  }

  async create(data: ThemeCreateData) {
    return this.prisma.resumeTheme.create({ data });
  }

  async update(id: string, data: ThemeUpdateData) {
    return this.prisma.resumeTheme.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.resumeTheme.delete({
      where: { id },
    });
  }

  async incrementUsageCount(id: string) {
    return this.prisma.resumeTheme.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
