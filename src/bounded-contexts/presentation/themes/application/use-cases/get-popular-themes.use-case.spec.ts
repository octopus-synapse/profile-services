import { beforeEach, describe, expect, it } from 'bun:test';
import { APP_CONFIG } from '@/shared-kernel';
import { createTestTheme, InMemoryThemeRepository } from '../../../testing';
import { ThemeStatus } from '../../domain/ports/theme.repository.port';
import { GetPopularThemesUseCase } from './get-popular-themes.use-case';

describe('GetPopularThemesUseCase', () => {
  let useCase: GetPopularThemesUseCase;
  let themeRepo: InMemoryThemeRepository;

  beforeEach(() => {
    themeRepo = new InMemoryThemeRepository();
    themeRepo.seed([
      createTestTheme({
        id: 'theme-1',
        name: 'Popular 1',
        usageCount: 100,
        status: ThemeStatus.PUBLISHED,
      }),
      createTestTheme({
        id: 'theme-2',
        name: 'Popular 2',
        usageCount: 50,
        status: ThemeStatus.PUBLISHED,
      }),
    ]);
    useCase = new GetPopularThemesUseCase(themeRepo);
  });

  it('should return popular themes', async () => {
    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[0].usageCount).toBeGreaterThanOrEqual(result[1].usageCount);
  });

  it('should use default limit from APP_CONFIG', async () => {
    const result = await useCase.execute();

    expect(result.length).toBeLessThanOrEqual(APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT);
  });

  it('should use custom limit when provided', async () => {
    const result = await useCase.execute(1);

    expect(result).toHaveLength(1);
  });
});
