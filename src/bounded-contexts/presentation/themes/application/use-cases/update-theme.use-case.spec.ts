import { beforeEach, describe, expect, it } from 'bun:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { UpdateThemeUseCase } from './update-theme.use-case';

describe('UpdateThemeUseCase', () => {
  let useCase: UpdateThemeUseCase;
  let themeRepo: {
    findById: ReturnType<typeof Function>;
    update: ReturnType<typeof Function>;
  };
  let authorization: { hasPermission: ReturnType<typeof Function> };

  const userId = 'user-1';
  const themeId = 'theme-1';

  const ownTheme = {
    id: themeId,
    authorId: userId,
    isSystemTheme: false,
    name: 'Original',
  };

  const updateData = { name: 'Updated Theme' };

  const updatedTheme = { ...ownTheme, name: 'Updated Theme' };

  beforeEach(() => {
    themeRepo = {
      findById: async () => ownTheme,
      update: async () => updatedTheme,
    };
    authorization = {
      hasPermission: async () => false,
    };
    useCase = new UpdateThemeUseCase(
      themeRepo as unknown as ThemeRepositoryPort,
      authorization as unknown as AuthorizationPort,
    );
  });

  it('should update own theme successfully', async () => {
    const result = await useCase.execute(userId, themeId, updateData);

    expect(result).toEqual(updatedTheme);
  });

  it('should throw NotFoundException when theme does not exist', async () => {
    themeRepo.findById = async () => null;

    expect(useCase.execute(userId, themeId, updateData)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when editing another user theme', async () => {
    themeRepo.findById = async () => ({ ...ownTheme, authorId: 'other-user' });

    expect(useCase.execute(userId, themeId, updateData)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException with correct message for other user theme', async () => {
    themeRepo.findById = async () => ({ ...ownTheme, authorId: 'other-user' });

    expect(useCase.execute(userId, themeId, updateData)).rejects.toThrow(
      ERROR_MESSAGES.CAN_ONLY_EDIT_OWN_THEMES,
    );
  });

  it('should throw ForbiddenException for system theme when user is not admin', async () => {
    themeRepo.findById = async () => ({ ...ownTheme, isSystemTheme: true, authorId: 'admin-1' });
    authorization.hasPermission = async () => false;

    expect(useCase.execute(userId, themeId, updateData)).rejects.toThrow(ForbiddenException);
  });

  it('should allow admin to edit system theme', async () => {
    themeRepo.findById = async () => ({ ...ownTheme, isSystemTheme: true, authorId: 'admin-1' });
    authorization.hasPermission = async () => true;

    const result = await useCase.execute(userId, themeId, updateData);

    expect(result).toEqual(updatedTheme);
  });

  it('should validate styleConfig when provided', async () => {
    const dataWithBadLayout = {
      styleConfig: { layout: 'not-an-object' } as Record<string, unknown>,
    };

    expect(useCase.execute(userId, themeId, dataWithBadLayout)).rejects.toThrow();
  });
});
