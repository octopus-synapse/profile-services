import { beforeEach, describe, expect, it } from 'bun:test';

import { ForbiddenException } from '@nestjs/common';
import { ThemeCategory, ThemeStatus } from '@prisma/client';
import type { CreateTheme } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import type { ThemeEntity, ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { CreateThemeAsAdminUseCase } from './create-theme-as-admin.use-case';

describe('CreateThemeAsAdminUseCase', () => {
  let useCase: CreateThemeAsAdminUseCase;
  let createdData: unknown;
  let permissionGranted: boolean;

  const fakeTheme: ThemeEntity = {
    id: 'theme-1',
    name: 'Admin Theme',
    description: 'Created by admin',
    category: ThemeCategory.PROFESSIONAL,
    status: ThemeStatus.PUBLISHED,
    authorId: 'admin-1',
    styleConfig: {},
    sectionStyles: {},
    thumbnailUrl: null,
    previewImages: [],
    parentThemeId: null,
    isSystemTheme: false,
    tags: ['modern'],
    usageCount: 0,
    rating: null,
    ratingCount: 0,
    version: '1.0.0',
    rejectionReason: null,
    rejectionCount: 0,
    approvedById: 'admin-1',
    approvedAt: new Date(),
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const themeRepo = {
    create: async (data: unknown) => {
      createdData = data;
      return { ...fakeTheme };
    },
  } as unknown as ThemeRepositoryPort;

  const authorization = {
    hasPermission: async () => permissionGranted,
  } as unknown as AuthorizationPort;

  beforeEach(() => {
    createdData = null;
    permissionGranted = true;
    useCase = new CreateThemeAsAdminUseCase(themeRepo, authorization);
  });

  it('should create a theme as PUBLISHED when user is admin', async () => {
    const input: CreateTheme = {
      name: 'Admin Theme',
      description: 'Created by admin',
      category: ThemeCategory.PROFESSIONAL,
      tags: ['modern'],
      styleConfig: {},
    };

    const result = await useCase.execute('admin-1', input);

    expect(result.status).toBe(ThemeStatus.PUBLISHED);
    expect(createdData).toBeTruthy();
    expect((createdData as Record<string, unknown>).status).toBe(ThemeStatus.PUBLISHED);
    expect((createdData as Record<string, unknown>).authorId).toBe('admin-1');
    expect((createdData as Record<string, unknown>).approvedById).toBe('admin-1');
  });

  it('should throw ForbiddenException when user is not admin', async () => {
    permissionGranted = false;

    const input: CreateTheme = {
      name: 'Theme',
      description: 'test',
      category: ThemeCategory.PROFESSIONAL,
      tags: [],
      styleConfig: {},
    };

    await expect(useCase.execute('user-1', input)).rejects.toThrow(ForbiddenException);
    expect(createdData).toBeNull();
  });
});
