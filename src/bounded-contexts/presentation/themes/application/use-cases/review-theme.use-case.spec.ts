import { beforeEach, describe, expect, it } from 'bun:test';

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ThemeCategory, ThemeStatus } from '@prisma/client';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import type { ThemeEntity, ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { ReviewThemeUseCase } from './review-theme.use-case';

describe('ReviewThemeUseCase', () => {
  let useCase: ReviewThemeUseCase;
  let foundTheme: ThemeEntity | null;
  let updatedData: { id: string; data: unknown } | null;
  let permissionGranted: boolean;

  const pendingTheme: ThemeEntity = {
    id: 'theme-1',
    name: 'Pending Theme',
    description: 'Waiting for review',
    category: ThemeCategory.PROFESSIONAL,
    status: ThemeStatus.PENDING_APPROVAL,
    authorId: 'author-1',
    styleConfig: {},
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const themeRepo = {
    findById: async () => foundTheme,
    update: async (id: string, data: unknown) => {
      updatedData = { id, data };
      return { ...pendingTheme, ...(data as object) };
    },
  } as unknown as ThemeRepositoryPort;

  const authorization = {
    hasPermission: async () => permissionGranted,
  } as unknown as AuthorizationPort;

  beforeEach(() => {
    foundTheme = { ...pendingTheme };
    updatedData = null;
    permissionGranted = true;
    useCase = new ReviewThemeUseCase(themeRepo, authorization);
  });

  it('should approve a pending theme', async () => {
    await useCase.execute('approver-1', { themeId: 'theme-1', approved: true });

    expect(updatedData).toBeTruthy();
    expect((updatedData!.data as Record<string, unknown>).status).toBe(ThemeStatus.PUBLISHED);
    expect((updatedData!.data as Record<string, unknown>).approvedById).toBe('approver-1');
  });

  it('should reject a pending theme with reason', async () => {
    await useCase.execute('approver-1', {
      themeId: 'theme-1',
      approved: false,
      rejectionReason: 'Needs better colors',
    });

    expect(updatedData).toBeTruthy();
    expect((updatedData!.data as Record<string, unknown>).status).toBe(ThemeStatus.REJECTED);
    expect((updatedData!.data as Record<string, unknown>).rejectionReason).toBe(
      'Needs better colors',
    );
  });

  it('should throw ForbiddenException when user is not an approver', async () => {
    permissionGranted = false;

    await expect(
      useCase.execute('user-1', { themeId: 'theme-1', approved: true }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException when theme does not exist', async () => {
    foundTheme = null;

    await expect(
      useCase.execute('approver-1', { themeId: 'theme-1', approved: true }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when theme is not pending approval', async () => {
    foundTheme = { ...pendingTheme, status: ThemeStatus.PUBLISHED };

    await expect(
      useCase.execute('approver-1', { themeId: 'theme-1', approved: true }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ForbiddenException when approver is the theme author', async () => {
    foundTheme = { ...pendingTheme, authorId: 'approver-1' };

    await expect(
      useCase.execute('approver-1', { themeId: 'theme-1', approved: true }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException when rejecting without a reason', async () => {
    await expect(
      useCase.execute('approver-1', { themeId: 'theme-1', approved: false }),
    ).rejects.toThrow(BadRequestException);
  });
});
