/**
 * Presentation Module Testing Infrastructure
 *
 * Provides in-memory implementations for testing without mocks.
 * Clean Architecture: Infrastructure layer for testing.
 */

import { mock } from 'bun:test';
import { AuthorizationPort } from '../themes/domain/ports/authorization.port';
import type {
  CreateThemeData,
  ThemeEntity,
  ThemeFilter,
  ThemeWithAuthor,
  UpdateThemeData,
} from '../themes/domain/ports/theme.repository.port';
import {
  ThemeRepositoryPort,
  type ThemeStatus,
} from '../themes/domain/ports/theme.repository.port';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ResumeShareRecord {
  id: string;
  resumeId: string;
  slug: string;
  password: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  resume?: Partial<ResumeRecord>;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  title: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  resumeSections?: ResumeSectionRecord[];
}

export interface ResumeSectionRecord {
  sectionType: { semanticKind: string };
  items: Array<{ content: unknown }>;
}

export type ThemeRecord = ThemeEntity;

// ============================================================================
// In-Memory Resume Share Repository
// ============================================================================

export class InMemoryResumeShareRepository {
  private shares: Map<string, ResumeShareRecord> = new Map();
  private slugIndex: Map<string, string> = new Map(); // slug -> id

  seed(shares: ResumeShareRecord[]): void {
    this.clear();
    for (const share of shares) {
      this.shares.set(share.id, share);
      this.slugIndex.set(share.slug, share.id);
    }
  }

  clear(): void {
    this.shares.clear();
    this.slugIndex.clear();
  }

  async create(data: {
    resumeId: string;
    slug: string;
    password: string | null;
    expiresAt: Date | null;
  }): Promise<ResumeShareRecord> {
    const id = `share-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();
    const share: ResumeShareRecord = {
      id,
      resumeId: data.resumeId,
      slug: data.slug,
      password: data.password,
      expiresAt: data.expiresAt,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.shares.set(id, share);
    this.slugIndex.set(data.slug, id);
    return share;
  }

  async findUnique(where: { id?: string; slug?: string }): Promise<ResumeShareRecord | null> {
    if (where.id) {
      return this.shares.get(where.id) ?? null;
    }
    if (where.slug) {
      const id = this.slugIndex.get(where.slug);
      return id ? (this.shares.get(id) ?? null) : null;
    }
    return null;
  }

  async findMany(where: { resumeId: string }): Promise<ResumeShareRecord[]> {
    return Array.from(this.shares.values())
      .filter((share) => share.resumeId === where.resumeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async delete(where: { id: string }): Promise<ResumeShareRecord> {
    const share = this.shares.get(where.id);
    if (!share) {
      throw new Error('Share not found');
    }
    this.shares.delete(where.id);
    this.slugIndex.delete(share.slug);
    return share;
  }

  getAll(): ResumeShareRecord[] {
    return Array.from(this.shares.values());
  }
}

// ============================================================================
// In-Memory Resume Repository
// ============================================================================

export class InMemoryResumeRepository {
  private resumes: Map<string, ResumeRecord> = new Map();

  seed(resumes: ResumeRecord[]): void {
    this.clear();
    for (const resume of resumes) {
      this.resumes.set(resume.id, resume);
    }
  }

  clear(): void {
    this.resumes.clear();
  }

  async findUnique(where: { id: string }): Promise<ResumeRecord | null> {
    return this.resumes.get(where.id) ?? null;
  }

  getAll(): ResumeRecord[] {
    return Array.from(this.resumes.values());
  }
}

// ============================================================================
// In-Memory Theme Repository (implements ThemeRepositoryPort)
// ============================================================================

export class InMemoryThemeRepository extends ThemeRepositoryPort {
  private themes: Map<string, ThemeEntity> = new Map();
  private authors: Map<
    string,
    { id: string; name: string | null; username: string | null; email: string | null }
  > = new Map();

  seed(themes: ThemeEntity[]): void {
    this.clear();
    for (const theme of themes) {
      this.themes.set(theme.id, theme);
    }
  }

  seedAuthors(
    authors: Array<{
      id: string;
      name: string | null;
      username: string | null;
      email: string | null;
    }>,
  ): void {
    for (const author of authors) {
      this.authors.set(author.id, author);
    }
  }

  clear(): void {
    this.themes.clear();
    this.authors.clear();
  }

  getAll(): ThemeEntity[] {
    return Array.from(this.themes.values());
  }

  async create(data: CreateThemeData): Promise<ThemeEntity> {
    const id = `theme-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();
    const theme: ThemeEntity = {
      id,
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      status: data.status,
      authorId: data.authorId,
      styleConfig: data.styleConfig,
      sectionStyles: {},
      thumbnailUrl: null,
      previewImages: [],
      parentThemeId: data.parentThemeId ?? null,
      isSystemTheme: false,
      tags: data.tags,
      usageCount: 0,
      rating: null,
      ratingCount: 0,
      version: '1.0.0',
      rejectionReason: null,
      rejectionCount: 0,
      approvedById: data.approvedById ?? null,
      approvedAt: data.approvedAt ?? null,
      publishedAt: data.publishedAt ?? null,
      atsScore: null,
      createdAt: now,
      updatedAt: now,
    };
    this.themes.set(id, theme);
    return theme;
  }

  async findById(id: string): Promise<ThemeEntity | null> {
    return this.themes.get(id) ?? null;
  }

  async findByIdWithAuthor(id: string): Promise<ThemeWithAuthor | null> {
    const theme = this.themes.get(id);
    if (!theme) return null;
    return this.withAuthor(theme);
  }

  async update(id: string, data: UpdateThemeData): Promise<ThemeEntity> {
    const theme = this.themes.get(id);
    if (!theme) throw new Error('Theme not found');

    let rejectionCount = theme.rejectionCount;
    if (
      data.rejectionCount &&
      typeof data.rejectionCount === 'object' &&
      'increment' in data.rejectionCount
    ) {
      rejectionCount += data.rejectionCount.increment;
    }

    const { rejectionCount: _, ...rest } = data;
    const updated: ThemeEntity = {
      ...theme,
      ...rest,
      rejectionCount,
      updatedAt: new Date(),
    };
    this.themes.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<ThemeEntity> {
    const theme = this.themes.get(id);
    if (!theme) throw new Error('Theme not found');
    this.themes.delete(id);
    return theme;
  }

  async countByAuthor(authorId: string): Promise<number> {
    return Array.from(this.themes.values()).filter((t) => t.authorId === authorId).length;
  }

  async findManyWithPagination(options: {
    filter: ThemeFilter;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    skip: number;
    take: number;
  }): Promise<{ themes: ThemeWithAuthor[]; total: number }> {
    let themes = Array.from(this.themes.values());

    const f = options.filter;
    if (f.status) themes = themes.filter((t) => t.status === f.status);
    if (f.authorId) themes = themes.filter((t) => t.authorId === f.authorId);
    if (f.category) themes = themes.filter((t) => t.category === f.category);
    if (f.isSystemTheme !== undefined)
      themes = themes.filter((t) => t.isSystemTheme === f.isSystemTheme);
    if (f.search) {
      const s = f.search.toLowerCase();
      themes = themes.filter(
        (t) => t.name.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s),
      );
    }

    const total = themes.length;

    themes.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[options.sortBy];
      const bVal = (b as Record<string, unknown>)[options.sortBy];
      if (aVal instanceof Date && bVal instanceof Date) {
        return options.sortDir === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }
      return 0;
    });

    themes = themes.slice(options.skip, options.skip + options.take);

    return { themes: themes.map((t) => this.withAuthor(t)), total };
  }

  async findPopular(limit: number): Promise<ThemeWithAuthor[]> {
    const themes = Array.from(this.themes.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
    return themes.map((t) => this.withAuthor(t));
  }

  async findSystemThemes(): Promise<ThemeEntity[]> {
    return Array.from(this.themes.values()).filter((t) => t.isSystemTheme);
  }

  async findByAuthor(authorId: string): Promise<ThemeEntity[]> {
    return Array.from(this.themes.values()).filter((t) => t.authorId === authorId);
  }

  async incrementUsageCount(id: string): Promise<void> {
    const theme = this.themes.get(id);
    if (theme) {
      theme.usageCount += 1;
      this.themes.set(id, theme);
    }
  }

  private withAuthor(theme: ThemeEntity): ThemeWithAuthor {
    const author = this.authors.get(theme.authorId);
    const forkCount = Array.from(this.themes.values()).filter(
      (t) => t.parentThemeId === theme.id,
    ).length;
    return {
      ...theme,
      author: {
        id: theme.authorId,
        name: author?.name ?? null,
        username: author?.username ?? null,
      },
      _count: { resumes: 0, forks: forkCount },
    };
  }
}

// ============================================================================
// In-Memory Cache Service
// ============================================================================

export class InMemoryCacheService {
  private cache: Map<string, { value: unknown; expiresAt?: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getAll(): Map<string, unknown> {
    const result = new Map<string, unknown>();
    for (const [key, entry] of this.cache) {
      result.set(key, entry.value);
    }
    return result;
  }
}

// ============================================================================
// Stub Event Publisher
// ============================================================================

export class StubEventPublisher {
  private events: Array<{ event: unknown; timestamp: Date }> = [];
  readonly publish = mock((event: unknown) => {
    this.events.push({ event, timestamp: new Date() });
  });
  readonly publishAsync = mock(async (event: unknown) => {
    this.events.push({ event, timestamp: new Date() });
  });

  getPublishedEvents(): unknown[] {
    return this.events.map((e) => e.event);
  }

  clear(): void {
    this.events = [];
    this.publish.mockClear();
    this.publishAsync.mockClear();
  }
}

// ============================================================================
// Stub Authorization Service
// ============================================================================

export class StubAuthorizationService extends AuthorizationPort {
  private permissions: Map<string, Set<string>> = new Map();

  grantPermission(userId: string, permission: string): void {
    if (!this.permissions.has(userId)) {
      this.permissions.set(userId, new Set());
    }
    this.permissions.get(userId)?.add(permission);
  }

  revokePermission(userId: string, permission: string): void {
    this.permissions.get(userId)?.delete(permission);
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    return this.permissions.get(userId)?.has(`${resource}:${action}`) ?? false;
  }

  clear(): void {
    this.permissions.clear();
  }
}

// ============================================================================
// Factory Functions for Test Data
// ============================================================================

export const createTestResumeShare = (
  overrides: Partial<ResumeShareRecord> = {},
): ResumeShareRecord => ({
  id: 'share-123',
  resumeId: 'resume-123',
  slug: 'my-awesome-resume',
  password: null,
  expiresAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestResume = (overrides: Partial<ResumeRecord> = {}): ResumeRecord => ({
  id: 'resume-123',
  userId: 'user-123',
  title: 'Software Engineer Resume',
  slug: 'software-engineer-resume',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestTheme = (overrides: Partial<ThemeEntity> = {}): ThemeEntity => ({
  id: 'theme-123',
  name: 'Professional Theme',
  description: 'A professional theme for resumes',
  category: 'PROFESSIONAL' as ThemeEntity['category'],
  status: 'PRIVATE' as ThemeStatus,
  authorId: 'user-123',
  styleConfig: { colors: { primary: '#000' } },
  sectionStyles: {},
  thumbnailUrl: null,
  previewImages: [],
  parentThemeId: null,
  isSystemTheme: false,
  tags: [],
  usageCount: 0,
  rating: null,
  ratingCount: 0,
  version: '1.0.0',
  rejectionReason: null,
  rejectionCount: 0,
  approvedById: null,
  approvedAt: null,
  publishedAt: null,
  atsScore: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
