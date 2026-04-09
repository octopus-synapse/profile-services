import { beforeEach, describe, expect, it } from 'bun:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { DeleteThemeUseCase } from './delete-theme.use-case';

describe('DeleteThemeUseCase', () => {
  let useCase: DeleteThemeUseCase;
  let themeRepo: { findById: ReturnType<typeof Function>; delete: ReturnType<typeof Function> };

  const userId = 'user-1';
  const themeId = 'theme-1';

  const ownTheme = {
    id: themeId,
    authorId: userId,
    isSystemTheme: false,
  };

  beforeEach(() => {
    themeRepo = {
      findById: async () => ownTheme,
      delete: async () => ownTheme,
    };
    useCase = new DeleteThemeUseCase(themeRepo as unknown as ThemeRepositoryPort);
  });

  it('should delete own theme successfully', async () => {
    const result = await useCase.execute(userId, themeId);

    expect(result).toEqual(ownTheme);
  });

  it('should throw NotFoundException when theme does not exist', async () => {
    themeRepo.findById = async () => null;

    expect(useCase.execute(userId, themeId)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when trying to delete a system theme', async () => {
    themeRepo.findById = async () => ({ ...ownTheme, isSystemTheme: true });

    expect(useCase.execute(userId, themeId)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException with correct message for system theme', async () => {
    themeRepo.findById = async () => ({ ...ownTheme, isSystemTheme: true });

    expect(useCase.execute(userId, themeId)).rejects.toThrow(
      ERROR_MESSAGES.CANNOT_DELETE_SYSTEM_THEMES,
    );
  });

  it('should throw ForbiddenException when trying to delete another user theme', async () => {
    themeRepo.findById = async () => ({ ...ownTheme, authorId: 'other-user' });

    expect(useCase.execute(userId, themeId)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException with correct message for other user theme', async () => {
    themeRepo.findById = async () => ({ ...ownTheme, authorId: 'other-user' });

    expect(useCase.execute(userId, themeId)).rejects.toThrow(
      ERROR_MESSAGES.CAN_ONLY_DELETE_OWN_THEMES,
    );
  });
});
