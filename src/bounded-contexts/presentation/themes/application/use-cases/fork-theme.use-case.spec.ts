import { beforeEach, describe, expect, it } from 'bun:test';

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ThemeCategory, ThemeStatus } from '@prisma/client';
import type { ThemeEntity, ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { ForkThemeUseCase } from './fork-theme.use-case';

describe('ForkThemeUseCase', () => {
  let useCase: ForkThemeUseCase;
  let createdData: unknown;
  let foundTheme: ThemeEntity | null;

  const publishedTheme: ThemeEntity = {
    id: 'theme-1',
    name: 'Original Theme',
    description: 'A theme',
    category: ThemeCategory.PROFESSIONAL,
    status: ThemeStatus.PUBLISHED,
    authorId: 'author-1',
    styleConfig: { color: 'blue' },
    sectionStyles: {},
    thumbnailUrl: null,
    previewImages: [],
    parentThemeId: null,
    isSystemTheme: false,
    tags: ['modern'],
    usageCount: 10,
    rating: null,
    ratingCount: 0,
    version: '1.0.0',
    rejectionReason: null,
    rejectionCount: 0,
    approvedById: null,
    approvedAt: null,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const themeRepo = {
    findById: async () => foundTheme,
    create: async (data: unknown) => {
      createdData = data;
      return { ...publishedTheme, id: 'theme-2', ...(data as object) };
    },
  } as unknown as ThemeRepositoryPort;

  beforeEach(() => {
    createdData = null;
    foundTheme = { ...publishedTheme };
    useCase = new ForkThemeUseCase(themeRepo);
  });

  it('should fork a published theme successfully', async () => {
    const result = await useCase.execute('user-1', { themeId: 'theme-1', name: 'My Fork' });

    expect(createdData).toBeTruthy();
    expect((createdData as Record<string, unknown>).parentThemeId).toBe('theme-1');
    expect((createdData as Record<string, unknown>).authorId).toBe('user-1');
    expect((createdData as Record<string, unknown>).status).toBe(ThemeStatus.PRIVATE);
    expect((createdData as Record<string, unknown>).name).toBe('My Fork');
  });

  it('should allow forking own unpublished theme', async () => {
    foundTheme = { ...publishedTheme, status: ThemeStatus.PRIVATE, authorId: 'user-1' };

    await useCase.execute('user-1', { themeId: 'theme-1', name: 'My Fork' });

    expect(createdData).toBeTruthy();
  });

  it('should throw NotFoundException when theme does not exist', async () => {
    foundTheme = null;

    await expect(
      useCase.execute('user-1', { themeId: 'nonexistent', name: 'Fork' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when forking unpublished theme of another user', async () => {
    foundTheme = { ...publishedTheme, status: ThemeStatus.PRIVATE, authorId: 'other-user' };

    await expect(
      useCase.execute('user-1', { themeId: 'theme-1', name: 'Fork' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
