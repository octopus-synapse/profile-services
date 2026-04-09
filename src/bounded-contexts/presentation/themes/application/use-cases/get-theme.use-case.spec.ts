import { beforeEach, describe, expect, it } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { GetThemeUseCase } from './get-theme.use-case';

describe('GetThemeUseCase', () => {
  let useCase: GetThemeUseCase;
  let themeRepo: { findById: ReturnType<typeof Function> };

  const themeId = 'theme-1';
  const theme = { id: themeId, name: 'Test Theme' };

  beforeEach(() => {
    themeRepo = {
      findById: async () => theme,
    };
    useCase = new GetThemeUseCase(themeRepo as unknown as ThemeRepositoryPort);
  });

  it('should return theme when found', async () => {
    const result = await useCase.execute(themeId);

    expect(result).toEqual(theme);
  });

  it('should throw NotFoundException when theme does not exist', async () => {
    themeRepo.findById = async () => null;

    expect(useCase.execute(themeId)).rejects.toThrow(NotFoundException);
  });

  it('should throw with correct error message when theme not found', async () => {
    themeRepo.findById = async () => null;

    expect(useCase.execute(themeId)).rejects.toThrow(ERROR_MESSAGES.THEME_NOT_FOUND);
  });
});
