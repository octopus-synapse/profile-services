import { beforeEach, describe, expect, it } from 'bun:test';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ThemeCategory, ThemeStatus } from '@prisma/client';
import type { ThemeEntity, ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { SubmitThemeForApprovalUseCase } from './submit-theme-for-approval.use-case';

describe('SubmitThemeForApprovalUseCase', () => {
  let useCase: SubmitThemeForApprovalUseCase;
  let foundTheme: ThemeEntity | null;
  let updatedData: { id: string; data: unknown } | null;

  const baseTheme: ThemeEntity = {
    id: 'theme-1',
    name: 'My Theme',
    description: 'A theme',
    category: ThemeCategory.PROFESSIONAL,
    status: ThemeStatus.PRIVATE,
    authorId: 'user-1',
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
      return { ...baseTheme, ...(data as object) };
    },
  } as unknown as ThemeRepositoryPort;

  beforeEach(() => {
    foundTheme = { ...baseTheme };
    updatedData = null;
    useCase = new SubmitThemeForApprovalUseCase(themeRepo);
  });

  it('should submit a private theme for approval', async () => {
    await useCase.execute('user-1', 'theme-1');

    expect(updatedData).toBeTruthy();
    expect((updatedData!.data as Record<string, unknown>).status).toBe(
      ThemeStatus.PENDING_APPROVAL,
    );
  });

  it('should submit a rejected theme for approval when under resubmission limit', async () => {
    foundTheme = { ...baseTheme, status: ThemeStatus.REJECTED, rejectionCount: 1 };

    await useCase.execute('user-1', 'theme-1');

    expect(updatedData).toBeTruthy();
    expect((updatedData!.data as Record<string, unknown>).status).toBe(
      ThemeStatus.PENDING_APPROVAL,
    );
  });

  it('should throw NotFoundException when theme does not exist', async () => {
    foundTheme = null;

    await expect(useCase.execute('user-1', 'theme-1')).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when submitting another users theme', async () => {
    foundTheme = { ...baseTheme, authorId: 'other-user' };

    await expect(useCase.execute('user-1', 'theme-1')).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException when theme is already published', async () => {
    foundTheme = { ...baseTheme, status: ThemeStatus.PUBLISHED };

    await expect(useCase.execute('user-1', 'theme-1')).rejects.toThrow(BadRequestException);
  });

  it('should throw UnprocessableEntityException when resubmission limit reached', async () => {
    foundTheme = { ...baseTheme, status: ThemeStatus.REJECTED, rejectionCount: 2 };

    await expect(useCase.execute('user-1', 'theme-1')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
