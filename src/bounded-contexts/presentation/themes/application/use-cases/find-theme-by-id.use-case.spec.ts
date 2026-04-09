import { beforeEach, describe, expect, it } from 'bun:test';
import { ThemeStatus } from '@prisma/client';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { FindThemeByIdUseCase } from './find-theme-by-id.use-case';

describe('FindThemeByIdUseCase', () => {
  let useCase: FindThemeByIdUseCase;
  let themeRepo: { findByIdWithAuthor: ReturnType<typeof Function> };

  const themeId = 'theme-1';
  const authorId = 'user-1';

  const publishedTheme = {
    id: themeId,
    authorId,
    status: ThemeStatus.PUBLISHED,
    author: { id: authorId, name: 'Author', username: 'author' },
    _count: { resumes: 5, forks: 2 },
  };

  beforeEach(() => {
    themeRepo = {
      findByIdWithAuthor: async () => publishedTheme,
    };
    useCase = new FindThemeByIdUseCase(themeRepo as unknown as ThemeRepositoryPort);
  });

  it('should return a published theme for any user', async () => {
    const result = await useCase.execute(themeId, 'any-user');

    expect(result).toEqual(publishedTheme);
  });

  it('should return a published theme when no userId is provided', async () => {
    const result = await useCase.execute(themeId);

    expect(result).toEqual(publishedTheme);
  });

  it('should return null when theme does not exist', async () => {
    themeRepo.findByIdWithAuthor = async () => null;

    const result = await useCase.execute(themeId);

    expect(result).toBeNull();
  });

  it('should return null for non-published theme when user is not the author', async () => {
    themeRepo.findByIdWithAuthor = async () => ({
      ...publishedTheme,
      status: ThemeStatus.PRIVATE,
    });

    const result = await useCase.execute(themeId, 'other-user');

    expect(result).toBeNull();
  });

  it('should return non-published theme when user is the author', async () => {
    const privateTheme = { ...publishedTheme, status: ThemeStatus.PRIVATE };
    themeRepo.findByIdWithAuthor = async () => privateTheme;

    const result = await useCase.execute(themeId, authorId);

    expect(result).toEqual(privateTheme);
  });

  it('should return null for non-published theme when no userId provided', async () => {
    themeRepo.findByIdWithAuthor = async () => ({
      ...publishedTheme,
      status: ThemeStatus.PRIVATE,
    });

    const result = await useCase.execute(themeId);

    expect(result).toBeNull();
  });
});
