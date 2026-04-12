import { beforeEach, describe, expect, it } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import { createTestTheme, InMemoryThemeRepository } from '../../../testing';
import { GetThemeUseCase } from './get-theme.use-case';

describe('GetThemeUseCase', () => {
  let useCase: GetThemeUseCase;
  let themeRepo: InMemoryThemeRepository;

  const themeId = 'theme-1';

  beforeEach(() => {
    themeRepo = new InMemoryThemeRepository();
    themeRepo.seed([createTestTheme({ id: themeId, name: 'Test Theme' })]);
    useCase = new GetThemeUseCase(themeRepo);
  });

  it('should return theme when found', async () => {
    const result = await useCase.execute(themeId);

    expect(result.id).toBe(themeId);
  });

  it('should throw NotFoundException when theme does not exist', async () => {
    expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should throw with correct error message when theme not found', async () => {
    expect(useCase.execute('nonexistent')).rejects.toThrow(ERROR_MESSAGES.THEME_NOT_FOUND);
  });
});
