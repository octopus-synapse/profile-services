import { beforeEach, describe, expect, it } from 'bun:test';
import { UnprocessableEntityException } from '@nestjs/common';
import { ThemeStatus } from '@prisma/client';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { CreateThemeUseCase } from './create-theme.use-case';

describe('CreateThemeUseCase', () => {
  let useCase: CreateThemeUseCase;
  let themeRepo: { create: ReturnType<typeof Function>; countByAuthor: ReturnType<typeof Function> };

  const userId = 'user-1';
  const themeData = {
    name: 'My Theme',
    description: 'A test theme',
    category: 'PROFESSIONAL' as const,
    tags: ['clean', 'modern'],
    styleConfig: {} as Record<string, unknown>,
  };

  const createdTheme = {
    id: 'theme-1',
    name: themeData.name,
    authorId: userId,
    status: ThemeStatus.PRIVATE,
  };

  beforeEach(() => {
    themeRepo = {
      create: async () => createdTheme,
      countByAuthor: async () => 0,
    };
    useCase = new CreateThemeUseCase(themeRepo as unknown as ThemeRepositoryPort);
  });

  it('should create a theme when user is under the limit', async () => {
    const result = await useCase.execute(userId, themeData);

    expect(result).toEqual(createdTheme);
  });

  it('should throw UnprocessableEntityException when user has 5 themes', async () => {
    themeRepo.countByAuthor = async () => 5;

    expect(useCase.execute(userId, themeData)).rejects.toThrow(UnprocessableEntityException);
  });

  it('should throw UnprocessableEntityException with correct message when limit reached', async () => {
    themeRepo.countByAuthor = async () => 5;

    expect(useCase.execute(userId, themeData)).rejects.toThrow(ERROR_MESSAGES.THEME_LIMIT_REACHED);
  });

  it('should validate layout config when provided', async () => {
    const dataWithBadLayout = {
      ...themeData,
      styleConfig: { layout: 'not-an-object' } as Record<string, unknown>,
    };

    expect(useCase.execute(userId, dataWithBadLayout)).rejects.toThrow();
  });

  it('should validate sections config when provided', async () => {
    const dataWithBadSections = {
      ...themeData,
      styleConfig: { sections: 'not-an-array' } as Record<string, unknown>,
    };

    expect(useCase.execute(userId, dataWithBadSections)).rejects.toThrow();
  });
});
