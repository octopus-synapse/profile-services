import { beforeEach, describe, expect, it } from 'bun:test';
import { APP_CONFIG } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { GetPopularThemesUseCase } from './get-popular-themes.use-case';

describe('GetPopularThemesUseCase', () => {
  let useCase: GetPopularThemesUseCase;
  let themeRepo: { findPopular: ReturnType<typeof Function> };
  let lastLimit: number | null;

  const popularThemes = [
    { id: 'theme-1', name: 'Popular 1', usageCount: 100 },
    { id: 'theme-2', name: 'Popular 2', usageCount: 50 },
  ];

  beforeEach(() => {
    lastLimit = null;
    themeRepo = {
      findPopular: async (limit: number) => {
        lastLimit = limit;
        return popularThemes;
      },
    };
    useCase = new GetPopularThemesUseCase(themeRepo as unknown as ThemeRepositoryPort);
  });

  it('should return popular themes', async () => {
    const result = await useCase.execute();

    expect(result).toEqual(popularThemes);
  });

  it('should use default limit from APP_CONFIG', async () => {
    await useCase.execute();

    expect(lastLimit).toBe(APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT);
  });

  it('should use custom limit when provided', async () => {
    await useCase.execute(20);

    expect(lastLimit).toBe(20);
  });
});
