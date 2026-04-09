import { beforeEach, describe, expect, it } from 'bun:test';

import { ForbiddenException } from '@nestjs/common';
import type {
  ResumeRepositoryPort,
  ResumeWithTheme,
} from '../../domain/ports/resume.repository.port';
import { GetResolvedThemeConfigUseCase } from './get-resolved-theme-config.use-case';

describe('GetResolvedThemeConfigUseCase', () => {
  let useCase: GetResolvedThemeConfigUseCase;
  let foundResume: ResumeWithTheme | null;

  const resumeRepo = {
    findByIdWithTheme: async () => foundResume,
  } as unknown as ResumeRepositoryPort;

  beforeEach(() => {
    foundResume = {
      id: 'resume-1',
      userId: 'user-1',
      activeThemeId: 'theme-1',
      customTheme: null,
      activeTheme: {
        id: 'theme-1',
        styleConfig: { colors: { primary: '#000' }, font: 'Arial' },
      },
    };
    useCase = new GetResolvedThemeConfigUseCase(resumeRepo);
  });

  it('should return base theme config when no custom overrides', async () => {
    const result = await useCase.execute('resume-1', 'user-1');

    expect(result).toEqual({ colors: { primary: '#000' }, font: 'Arial' });
  });

  it('should return merged config when custom overrides exist', async () => {
    foundResume = {
      ...foundResume!,
      customTheme: { colors: { primary: '#fff' } },
    };

    const result = await useCase.execute('resume-1', 'user-1');

    expect(result).toBeTruthy();
    expect((result as Record<string, unknown>).font).toBe('Arial');
    expect(
      ((result as Record<string, Record<string, unknown>>).colors as Record<string, unknown>)
        .primary,
    ).toBe('#fff');
  });

  it('should return null when resume has no active theme', async () => {
    foundResume = {
      ...foundResume!,
      activeThemeId: null,
      activeTheme: null,
    };

    const result = await useCase.execute('resume-1', 'user-1');

    expect(result).toBeNull();
  });

  it('should throw ForbiddenException when resume does not belong to user', async () => {
    foundResume = { ...foundResume!, userId: 'other-user' };

    await expect(useCase.execute('resume-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when resume is not found', async () => {
    foundResume = null;

    await expect(useCase.execute('resume-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });
});
