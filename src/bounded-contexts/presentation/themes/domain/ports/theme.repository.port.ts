/**
 * Theme Repository Port
 *
 * Abstraction for theme persistence operations.
 * Domain types — no infrastructure dependencies.
 */

// ============================================================================
// Domain Types
// ============================================================================

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export const ThemeStatus = {
  DRAFT: 'DRAFT',
  PRIVATE: 'PRIVATE',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
} as const;
export type ThemeStatus = (typeof ThemeStatus)[keyof typeof ThemeStatus];

export const ThemeCategory = {
  PROFESSIONAL: 'PROFESSIONAL',
  CREATIVE: 'CREATIVE',
  TECHNICAL: 'TECHNICAL',
  ACADEMIC: 'ACADEMIC',
  MINIMAL: 'MINIMAL',
  MODERN: 'MODERN',
  CLASSIC: 'CLASSIC',
  EXECUTIVE: 'EXECUTIVE',
} as const;
export type ThemeCategory = (typeof ThemeCategory)[keyof typeof ThemeCategory];

export type ThemeEntity = {
  id: string;
  name: string;
  description: string | null;
  category: ThemeCategory;
  status: ThemeStatus;
  authorId: string;
  styleConfig: JsonValue;
  sectionStyles: JsonValue;
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
  atsScore: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ThemeWithAuthor = ThemeEntity & {
  author: { id: string; name: string | null; username: string | null };
  _count: { resumes: number; forks: number };
};

export type CreateThemeData = {
  name: string;
  description?: string;
  category: ThemeCategory;
  tags: string[];
  styleConfig: JsonValue;
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
  styleConfig?: JsonValue;
  status?: ThemeStatus;
  rejectionReason?: string | null;
  rejectionCount?: { increment: number };
  approvedById?: string;
  approvedAt?: Date;
  publishedAt?: Date;
};

export type ThemeFilter = {
  status?: ThemeStatus;
  category?: ThemeCategory;
  authorId?: string;
  isSystemTheme?: boolean;
  search?: string;
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
    filter: ThemeFilter;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    skip: number;
    take: number;
  }): Promise<{ themes: ThemeWithAuthor[]; total: number }>;

  abstract findPopular(limit: number): Promise<ThemeWithAuthor[]>;
  abstract findSystemThemes(): Promise<ThemeEntity[]>;
  abstract findByAuthor(authorId: string): Promise<ThemeEntity[]>;

  abstract incrementUsageCount(id: string): Promise<void>;
}
