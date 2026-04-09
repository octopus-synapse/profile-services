import { beforeEach, describe, expect, it } from 'bun:test';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { GetUserThemesUseCase } from './get-user-themes.use-case';

describe('GetUserThemesUseCase', () => {
  let useCase: GetUserThemesUseCase;
  let themeRepo: { findByAuthor: ReturnType<typeof Function> };

  const userId = 'user-1';
  const userThemes = [
    { id: 'theme-1', name: 'Theme 1', authorId: userId },
    { id: 'theme-2', name: 'Theme 2', authorId: userId },
  ];

  beforeEach(() => {
    themeRepo = {
      findByAuthor: async () => userThemes,
    };
    useCase = new GetUserThemesUseCase(themeRepo as unknown as ThemeRepositoryPort);
  });

  it('should return themes for the given user', async () => {
    const result = await useCase.execute(userId);

    expect(result).toEqual(userThemes);
  });

  it('should return empty array when user has no themes', async () => {
    themeRepo.findByAuthor = async () => [];

    const result = await useCase.execute(userId);

    expect(result).toEqual([]);
  });
});
