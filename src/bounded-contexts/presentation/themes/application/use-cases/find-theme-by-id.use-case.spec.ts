import { beforeEach, describe, expect, it } from 'bun:test';
import { createTestTheme, InMemoryThemeRepository } from '../../../testing';
import { ThemeStatus } from '../../domain/ports/theme.repository.port';
import { FindThemeByIdUseCase } from './find-theme-by-id.use-case';

describe('FindThemeByIdUseCase', () => {
  let useCase: FindThemeByIdUseCase;
  let themeRepo: InMemoryThemeRepository;

  const themeId = 'theme-1';
  const authorId = 'user-1';

  beforeEach(() => {
    themeRepo = new InMemoryThemeRepository();
    themeRepo.seed([createTestTheme({ id: themeId, authorId, status: ThemeStatus.PUBLISHED })]);
    themeRepo.seedAuthors([{ id: authorId, name: 'Author', username: 'author', email: null }]);
    useCase = new FindThemeByIdUseCase(themeRepo);
  });

  it('should return a theme with author info', async () => {
    const result = await useCase.execute(themeId);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(themeId);
    expect(result?.author).toBeDefined();
  });

  it('should return null when theme does not exist', async () => {
    const result = await useCase.execute('nonexistent');

    expect(result).toBeNull();
  });
});
