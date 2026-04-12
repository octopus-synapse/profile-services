import { beforeEach, describe, expect, it } from 'bun:test';
import type { QueryThemes } from '@/shared-kernel';
import { createTestTheme, InMemoryThemeRepository } from '../../../testing';
import { ThemeCategory, ThemeStatus } from '../../domain/ports/theme.repository.port';
import { ListThemesUseCase } from './list-themes.use-case';

const defaultQuery: QueryThemes = {
  sortBy: 'createdAt',
  sortDir: 'desc',
  page: 1,
  limit: 20,
};

const query = (overrides: Partial<QueryThemes> = {}): QueryThemes => ({
  ...defaultQuery,
  ...overrides,
});

describe('ListThemesUseCase', () => {
  let useCase: ListThemesUseCase;
  let themeRepo: InMemoryThemeRepository;

  beforeEach(() => {
    themeRepo = new InMemoryThemeRepository();
    themeRepo.seed([
      createTestTheme({ id: 'theme-1', name: 'Theme 1', status: ThemeStatus.PUBLISHED }),
      createTestTheme({ id: 'theme-2', name: 'Theme 2', status: ThemeStatus.PUBLISHED }),
    ]);
    useCase = new ListThemesUseCase(themeRepo);
  });

  it('should return paginated themes with defaults', async () => {
    const result = await useCase.execute(query());

    expect(result.themes).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('should return all themes without visibility filtering', async () => {
    themeRepo.seed([
      createTestTheme({ id: 'theme-1', status: ThemeStatus.PUBLISHED }),
      createTestTheme({ id: 'theme-2', status: ThemeStatus.PRIVATE }),
    ]);

    const result = await useCase.execute(query());

    expect(result.themes).toHaveLength(2);
  });

  it('should apply category filter', async () => {
    themeRepo.seed([
      createTestTheme({
        id: 'theme-1',
        category: ThemeCategory.PROFESSIONAL,
        status: ThemeStatus.PUBLISHED,
      }),
      createTestTheme({
        id: 'theme-2',
        category: ThemeCategory.CREATIVE,
        status: ThemeStatus.PUBLISHED,
      }),
    ]);

    const result = await useCase.execute(query({ category: ThemeCategory.PROFESSIONAL }));

    expect(result.themes).toHaveLength(1);
  });

  it('should apply systemOnly filter', async () => {
    themeRepo.seed([
      createTestTheme({ id: 'theme-1', isSystemTheme: true, status: ThemeStatus.PUBLISHED }),
      createTestTheme({ id: 'theme-2', isSystemTheme: false, status: ThemeStatus.PUBLISHED }),
    ]);

    const result = await useCase.execute(query({ systemOnly: true }));

    expect(result.themes).toHaveLength(1);
    expect((result.themes[0] as { id: string }).id).toBe('theme-1');
  });

  it('should calculate pagination correctly', async () => {
    themeRepo.seed(
      Array.from({ length: 50 }, (_, i) =>
        createTestTheme({ id: `theme-${i}`, status: ThemeStatus.PUBLISHED }),
      ),
    );

    const result = await useCase.execute(query({ page: 2, limit: 10 }));

    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.totalPages).toBe(5);
    expect(result.pagination.total).toBe(50);
  });
});
