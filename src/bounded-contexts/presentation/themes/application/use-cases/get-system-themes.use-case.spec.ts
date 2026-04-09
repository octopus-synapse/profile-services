import { beforeEach, describe, expect, it } from 'bun:test';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { GetSystemThemesUseCase } from './get-system-themes.use-case';

describe('GetSystemThemesUseCase', () => {
  let useCase: GetSystemThemesUseCase;
  let themeRepo: { findSystemThemes: ReturnType<typeof Function> };

  const systemThemes = [
    { id: 'sys-1', name: 'Default', isSystemTheme: true },
    { id: 'sys-2', name: 'Minimal', isSystemTheme: true },
  ];

  beforeEach(() => {
    themeRepo = {
      findSystemThemes: async () => systemThemes,
    };
    useCase = new GetSystemThemesUseCase(themeRepo as unknown as ThemeRepositoryPort);
  });

  it('should return all system themes', async () => {
    const result = await useCase.execute();

    expect(result).toEqual(systemThemes);
  });

  it('should return empty array when no system themes exist', async () => {
    themeRepo.findSystemThemes = async () => [];

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
