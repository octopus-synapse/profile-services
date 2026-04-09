import { beforeEach, describe, expect, it } from 'bun:test';
import { ThemeStatus } from '@prisma/client';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { ListThemesUseCase } from './list-themes.use-case';

describe('ListThemesUseCase', () => {
  let useCase: ListThemesUseCase;
  let themeRepo: { findManyWithPagination: ReturnType<typeof Function> };
  let lastQuery: Record<string, unknown> | null;

  const themes = [
    { id: 'theme-1', name: 'Theme 1' },
    { id: 'theme-2', name: 'Theme 2' },
  ];

  beforeEach(() => {
    lastQuery = null;
    themeRepo = {
      findManyWithPagination: async (opts: Record<string, unknown>) => {
        lastQuery = opts;
        return { themes, total: 2 };
      },
    };
    useCase = new ListThemesUseCase(themeRepo as unknown as ThemeRepositoryPort);
  });

  it('should return paginated themes with defaults', async () => {
    const result = await useCase.execute({});

    expect(result.themes).toEqual(themes);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('should filter by PUBLISHED status when no userId is provided', async () => {
    await useCase.execute({});

    expect((lastQuery as Record<string, unknown>).where).toEqual({
      status: ThemeStatus.PUBLISHED,
    });
  });

  it('should not force PUBLISHED status when userId is provided', async () => {
    await useCase.execute({}, 'user-1');

    expect((lastQuery as Record<string, unknown>).where).toEqual({});
  });

  it('should apply status filter when explicitly provided', async () => {
    await useCase.execute({ status: ThemeStatus.PRIVATE });

    expect(
      ((lastQuery as Record<string, unknown>).where as Record<string, unknown>).status,
    ).toBe(ThemeStatus.PRIVATE);
  });

  it('should apply search filter', async () => {
    await useCase.execute({ search: 'modern' });

    const where = (lastQuery as Record<string, unknown>).where as Record<string, unknown>;
    expect(where.OR).toBeDefined();
  });

  it('should apply category filter', async () => {
    await useCase.execute({ category: 'PROFESSIONAL' as never });

    const where = (lastQuery as Record<string, unknown>).where as Record<string, unknown>;
    expect(where.category).toBe('PROFESSIONAL');
  });

  it('should apply systemOnly filter', async () => {
    await useCase.execute({ systemOnly: true });

    const where = (lastQuery as Record<string, unknown>).where as Record<string, unknown>;
    expect(where.isSystemTheme).toBe(true);
  });

  it('should calculate pagination correctly', async () => {
    themeRepo.findManyWithPagination = async () => ({ themes: [], total: 50 });

    const result = await useCase.execute({ page: 2, limit: 10 });

    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.totalPages).toBe(5);
    expect(result.pagination.total).toBe(50);
  });
});
