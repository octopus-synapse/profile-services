import { beforeEach, describe, expect, it } from 'bun:test';
import { createTestTheme, InMemoryThemeRepository } from '../../../testing';
import { GetUserThemesUseCase } from './get-user-themes.use-case';

describe('GetUserThemesUseCase', () => {
  let useCase: GetUserThemesUseCase;
  let themeRepo: InMemoryThemeRepository;

  const userId = 'user-1';

  beforeEach(() => {
    themeRepo = new InMemoryThemeRepository();
    themeRepo.seed([
      createTestTheme({ id: 'theme-1', name: 'Theme 1', authorId: userId }),
      createTestTheme({ id: 'theme-2', name: 'Theme 2', authorId: userId }),
    ]);
    useCase = new GetUserThemesUseCase(themeRepo);
  });

  it('should return themes for the given user', async () => {
    const result = await useCase.execute(userId);

    expect(result).toHaveLength(2);
  });

  it('should return empty array when user has no themes', async () => {
    const result = await useCase.execute('no-themes-user');

    expect(result).toEqual([]);
  });
});
