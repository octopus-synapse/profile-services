import { beforeEach, describe, expect, it } from 'bun:test';
import { createTestTheme, InMemoryThemeRepository } from '../../../testing';
import { GetSystemThemesUseCase } from './get-system-themes.use-case';

describe('GetSystemThemesUseCase', () => {
  let useCase: GetSystemThemesUseCase;
  let themeRepo: InMemoryThemeRepository;

  beforeEach(() => {
    themeRepo = new InMemoryThemeRepository();
    themeRepo.seed([
      createTestTheme({ id: 'sys-1', name: 'Default', isSystemTheme: true }),
      createTestTheme({ id: 'sys-2', name: 'Minimal', isSystemTheme: true }),
    ]);
    useCase = new GetSystemThemesUseCase(themeRepo);
  });

  it('should return all system themes', async () => {
    const result = await useCase.execute();

    expect(result).toHaveLength(2);
  });

  it('should return empty array when no system themes exist', async () => {
    themeRepo.seed([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
