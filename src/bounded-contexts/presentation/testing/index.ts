/**
 * Presentation Module Testing Infrastructure
 *
 * Provides in-memory implementations for testing without mocks.
 * Clean Architecture: Infrastructure layer for testing.
 */

import { mock } from 'bun:test';
import type { ThemeStatus } from '@prisma/client';

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

export interface ThemeRecord {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: ThemeStatus;
  authorId: string;
  styleConfig: unknown;
  parentThemeId: string | null;
  isSystemTheme: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

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
// In-Memory Theme Repository
// ============================================================================

export class InMemoryThemeRepository {
  private themes: Map<string, ThemeRecord> = new Map();

  seed(themes: ThemeRecord[]): void {
    this.clear();
    for (const theme of themes) {
      this.themes.set(theme.id, theme);
    }
  }

  clear(): void {
    this.themes.clear();
  }

  async create(data: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThemeRecord> {
    const id = `theme-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();
    const theme: ThemeRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.themes.set(id, theme);
    return theme;
  }

  async findUnique(where: { id: string }): Promise<ThemeRecord | null> {
    return this.themes.get(where.id) ?? null;
  }

  async update(where: { id: string }, data: Partial<ThemeRecord>): Promise<ThemeRecord> {
    const theme = this.themes.get(where.id);
    if (!theme) {
      throw new Error('Theme not found');
    }
    const updated: ThemeRecord = {
      ...theme,
      ...data,
      updatedAt: new Date(),
    };
    this.themes.set(where.id, updated);
    return updated;
  }

  async delete(where: { id: string }): Promise<ThemeRecord> {
    const theme = this.themes.get(where.id);
    if (!theme) {
      throw new Error('Theme not found');
    }
    this.themes.delete(where.id);
    return theme;
  }

  async count(where?: { authorId?: string }): Promise<number> {
    if (!where) return this.themes.size;
    return Array.from(this.themes.values()).filter(
      (t) => !where.authorId || t.authorId === where.authorId,
    ).length;
  }

  getAll(): ThemeRecord[] {
    return Array.from(this.themes.values());
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

export class StubAuthorizationService {
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

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    return this.permissions.get(userId)?.has(permission) ?? false;
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

export const createTestTheme = (overrides: Partial<ThemeRecord> = {}): ThemeRecord => ({
  id: 'theme-123',
  name: 'Professional Theme',
  description: 'A professional theme for resumes',
  category: 'PROFESSIONAL',
  status: 'PRIVATE' as ThemeStatus,
  authorId: 'user-123',
  styleConfig: { colors: { primary: '#000' } },
  parentThemeId: null,
  isSystemTheme: false,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
