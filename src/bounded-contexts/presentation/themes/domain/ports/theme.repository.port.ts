/**
 * Theme Repository Port
 *
 * Abstraction for theme persistence operations.
 * Implemented by infrastructure adapters (e.g., Prisma).
 */

import type { Prisma, ThemeCategory, ThemeStatus } from '@prisma/client';

// ============================================================================
// Domain Types
// ============================================================================

export type ThemeEntity = {
  id: string;
  name: string;
  description: string | null;
  category: ThemeCategory;
  status: ThemeStatus;
  authorId: string;
  styleConfig: Prisma.JsonValue;
  sectionStyles: Prisma.JsonValue;
  thumbnailUrl: string | null;
  previewImages: string[];
  parentThemeId: string | null;
  isSystemTheme: boolean;
  tags: string[];
  usageCount: number;
  rating: number | null;
  ratingCount: number;
  version: string;
  rejectionReason: string | null;
  rejectionCount: number;
  approvedById: string | null;
  approvedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ThemeWithAuthor = ThemeEntity & {
  author: { id: string; name: string | null; username: string | null };
  _count: { resumes: number; forks: number };
};

export type ThemeWithAuthorEmail = ThemeEntity & {
  author: { id: string; name: string | null; email: string | null };
};

export type CreateThemeData = {
  name: string;
  description?: string;
  category: ThemeCategory;
  tags: string[];
  styleConfig: Prisma.InputJsonValue;
  parentThemeId?: string;
  authorId: string;
  status: ThemeStatus;
  approvedById?: string;
  approvedAt?: Date;
  publishedAt?: Date;
};

export type UpdateThemeData = {
  name?: string;
  description?: string;
  category?: ThemeCategory;
  tags?: string[];
  styleConfig?: Prisma.InputJsonValue;
  status?: ThemeStatus;
  rejectionReason?: string | null;
  rejectionCount?: { increment: number };
  approvedById?: string;
  approvedAt?: Date;
  publishedAt?: Date;
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class ThemeRepositoryPort {
  abstract create(data: CreateThemeData): Promise<ThemeEntity>;
  abstract findById(id: string): Promise<ThemeEntity | null>;
  abstract findByIdWithAuthor(id: string): Promise<ThemeWithAuthor | null>;
  abstract update(id: string, data: UpdateThemeData): Promise<ThemeEntity>;
  abstract delete(id: string): Promise<ThemeEntity>;
  abstract countByAuthor(authorId: string): Promise<number>;

  abstract findManyWithPagination(options: {
    where: Prisma.ResumeThemeWhereInput;
    orderBy: Record<string, 'asc' | 'desc'>;
    skip: number;
    take: number;
  }): Promise<{ themes: ThemeWithAuthor[]; total: number }>;

  abstract findPopular(limit: number): Promise<ThemeWithAuthor[]>;
  abstract findSystemThemes(): Promise<ThemeEntity[]>;
  abstract findByAuthor(authorId: string): Promise<ThemeEntity[]>;
  abstract findPendingApprovals(): Promise<ThemeWithAuthorEmail[]>;

  abstract incrementUsageCount(id: string): Promise<void>;
}
