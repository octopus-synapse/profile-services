/**
 * Theme Prisma Repository
 *
 * Infrastructure adapter implementing ThemeRepositoryPort with Prisma.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type CreateThemeData,
  type ThemeEntity,
  ThemeRepositoryPort,
  type ThemeWithAuthor,
  type ThemeWithAuthorEmail,
  type UpdateThemeData,
} from '../../../domain/ports/theme.repository.port';

export class ThemeRepository extends ThemeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateThemeData): Promise<ThemeEntity> {
    const result = await this.prisma.resumeTheme.create({ data });
    return result;
  }

  async findById(id: string): Promise<ThemeEntity | null> {
    const result = await this.prisma.resumeTheme.findUnique({
      where: { id },
    });
    return result;
  }

  async findByIdWithAuthor(id: string): Promise<ThemeWithAuthor | null> {
    const result = await this.prisma.resumeTheme.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { resumes: true, forks: true } },
      },
    });
    return result;
  }

  async update(id: string, data: UpdateThemeData): Promise<ThemeEntity> {
    const result = await this.prisma.resumeTheme.update({
      where: { id },
      data: data as Prisma.ResumeThemeUpdateInput,
    });
    return result;
  }

  async delete(id: string): Promise<ThemeEntity> {
    const result = await this.prisma.resumeTheme.delete({
      where: { id },
    });
    return result;
  }

  async countByAuthor(authorId: string): Promise<number> {
    return this.prisma.resumeTheme.count({ where: { authorId } });
  }

  async findManyWithPagination(options: {
    where: Prisma.ResumeThemeWhereInput;
    orderBy: Record<string, 'asc' | 'desc'>;
    skip: number;
    take: number;
  }): Promise<{ themes: ThemeWithAuthor[]; total: number }> {
    const [themes, total] = await Promise.all([
      this.prisma.resumeTheme.findMany({
        where: options.where,
        orderBy: options.orderBy,
        skip: options.skip,
        take: options.take,
        include: {
          author: { select: { id: true, name: true, username: true } },
          _count: { select: { resumes: true, forks: true } },
        },
      }),
      this.prisma.resumeTheme.count({ where: options.where }),
    ]);

    return {
      themes,
      total,
    };
  }

  async findPopular(limit: number): Promise<ThemeWithAuthor[]> {
    const result = await this.prisma.resumeTheme.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ usageCount: 'desc' }, { rating: 'desc' }],
      take: limit,
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { resumes: true, forks: true } },
      },
    });
    return result;
  }

  async findSystemThemes(): Promise<ThemeEntity[]> {
    const result = await this.prisma.resumeTheme.findMany({
      where: { isSystemTheme: true },
      orderBy: { name: 'asc' },
    });
    return result;
  }

  async findByAuthor(authorId: string): Promise<ThemeEntity[]> {
    const result = await this.prisma.resumeTheme.findMany({
      where: { authorId },
      orderBy: { updatedAt: 'desc' },
    });
    return result;
  }

  async findPendingApprovals(): Promise<ThemeWithAuthorEmail[]> {
    const result = await this.prisma.resumeTheme.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    return result;
  }

  async incrementUsageCount(id: string): Promise<void> {
    await this.prisma.resumeTheme.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
