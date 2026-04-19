/**
 * Theme Prisma Repository
 *
 * Infrastructure adapter implementing ThemeRepositoryPort with Prisma.
 * Uses structural typing — Prisma results are directly assignable to domain types.
 * Casts are only used for INPUT (domain → Prisma), never for OUTPUT.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { searchWhere } from '@/shared-kernel/database';
import {
  type CreateThemeData,
  type ThemeEntity,
  type ThemeFilter,
  ThemeRepositoryPort,
  type ThemeWithAuthor,
  type UpdateThemeData,
} from '../../../domain/ports/theme.repository.port';

export class ThemeRepository extends ThemeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateThemeData): Promise<ThemeEntity> {
    return this.prisma.resumeTheme.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags,
        styleConfig: data.styleConfig as Prisma.InputJsonValue,
        authorId: data.authorId,
        status: data.status,
        parentThemeId: data.parentThemeId,
        approvedById: data.approvedById,
        approvedAt: data.approvedAt,
        publishedAt: data.publishedAt,
      },
    });
  }

  async findById(id: string): Promise<ThemeEntity | null> {
    return this.prisma.resumeTheme.findUnique({ where: { id } });
  }

  async findByIdWithAuthor(id: string): Promise<ThemeWithAuthor | null> {
    return this.prisma.resumeTheme.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { resumes: true, forks: true } },
      },
    });
  }

  async update(id: string, data: UpdateThemeData): Promise<ThemeEntity> {
    const prismaData: Prisma.ResumeThemeUpdateInput = {};

    if (data.name !== undefined) prismaData.name = data.name;
    if (data.description !== undefined) prismaData.description = data.description;
    if (data.category !== undefined) prismaData.category = data.category;
    if (data.tags !== undefined) prismaData.tags = data.tags;
    if (data.styleConfig !== undefined)
      prismaData.styleConfig = data.styleConfig as Prisma.InputJsonValue;
    if (data.status !== undefined) prismaData.status = data.status;
    if (data.rejectionReason !== undefined) prismaData.rejectionReason = data.rejectionReason;
    if (data.rejectionCount) prismaData.rejectionCount = data.rejectionCount;
    if (data.approvedById !== undefined)
      prismaData.approvedBy = data.approvedById
        ? { connect: { id: data.approvedById } }
        : { disconnect: true };
    if (data.approvedAt !== undefined) prismaData.approvedAt = data.approvedAt;
    if (data.publishedAt !== undefined) prismaData.publishedAt = data.publishedAt;

    return this.prisma.resumeTheme.update({ where: { id }, data: prismaData });
  }

  async delete(id: string): Promise<ThemeEntity> {
    return this.prisma.resumeTheme.delete({ where: { id } });
  }

  async countByAuthor(authorId: string): Promise<number> {
    return this.prisma.resumeTheme.count({ where: { authorId } });
  }

  async findManyWithPagination(options: {
    filter: ThemeFilter;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    skip: number;
    take: number;
  }): Promise<{ themes: ThemeWithAuthor[]; total: number }> {
    const where = this.buildPrismaWhere(options.filter);

    const [themes, total] = await Promise.all([
      this.prisma.resumeTheme.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortDir },
        skip: options.skip,
        take: options.take,
        include: {
          author: { select: { id: true, name: true, username: true } },
          _count: { select: { resumes: true, forks: true } },
        },
      }),
      this.prisma.resumeTheme.count({ where }),
    ]);

    return { themes, total };
  }

  async findPopular(limit: number): Promise<ThemeWithAuthor[]> {
    return this.prisma.resumeTheme.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ usageCount: 'desc' }, { rating: 'desc' }],
      take: limit,
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { resumes: true, forks: true } },
      },
    });
  }

  async findSystemThemes(): Promise<ThemeEntity[]> {
    return this.prisma.resumeTheme.findMany({
      where: { isSystemTheme: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByAuthor(authorId: string): Promise<ThemeEntity[]> {
    return this.prisma.resumeTheme.findMany({
      where: { authorId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async incrementUsageCount(id: string): Promise<void> {
    await this.prisma.resumeTheme.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  private buildPrismaWhere(filter: ThemeFilter): Prisma.ResumeThemeWhereInput {
    const where: Prisma.ResumeThemeWhereInput = {};

    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;
    if (filter.authorId) where.authorId = filter.authorId;
    if (filter.isSystemTheme !== undefined) where.isSystemTheme = filter.isSystemTheme;

    if (filter.search) {
      where.OR = searchWhere(filter.search, ['name', 'description']);
    }

    return where;
  }
}
