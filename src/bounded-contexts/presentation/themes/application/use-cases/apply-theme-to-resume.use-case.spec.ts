import { beforeEach, describe, expect, it } from 'bun:test';

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ThemeCategory, ThemeStatus } from '@prisma/client';
import type { EventPublisher } from '@/shared-kernel';
import type { ResumeRepositoryPort } from '../../domain/ports/resume.repository.port';
import type {
  ThemeRepositoryPort,
  ThemeWithAuthor,
} from '../../domain/ports/theme.repository.port';
import { ApplyThemeToResumeUseCase } from './apply-theme-to-resume.use-case';

describe('ApplyThemeToResumeUseCase', () => {
  let useCase: ApplyThemeToResumeUseCase;
  let foundResume: { id: string; userId: string } | null;
  let foundTheme: ThemeWithAuthor | null;
  let appliedTheme: { resumeId: string; themeId: string } | null;
  let incrementedThemeId: string | null;
  let publishedEvents: unknown[];

  const themeRepo = {
    findByIdWithAuthor: async () => foundTheme,
    incrementUsageCount: async (id: string) => {
      incrementedThemeId = id;
    },
  } as unknown as ThemeRepositoryPort;

  const resumeRepo = {
    findById: async () => foundResume,
    applyTheme: async (resumeId: string, themeId: string) => {
      appliedTheme = { resumeId, themeId };
    },
  } as unknown as ResumeRepositoryPort;

  const eventPublisher = {
    publish: (event: unknown) => {
      publishedEvents.push(event);
    },
  } as unknown as EventPublisher;

  beforeEach(() => {
    foundResume = { id: 'resume-1', userId: 'user-1' };
    foundTheme = {
      id: 'theme-1',
      status: ThemeStatus.PUBLISHED,
      authorId: 'author-1',
    } as unknown as ThemeWithAuthor;
    appliedTheme = null;
    incrementedThemeId = null;
    publishedEvents = [];
    useCase = new ApplyThemeToResumeUseCase(themeRepo, resumeRepo, eventPublisher);
  });

  it('should apply a published theme to a resume', async () => {
    await useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'theme-1' });

    expect(appliedTheme).toEqual({ resumeId: 'resume-1', themeId: 'theme-1' });
    expect(incrementedThemeId).toBe('theme-1');
    expect(publishedEvents).toHaveLength(1);
  });

  it('should allow applying own unpublished theme', async () => {
    foundTheme = {
      id: 'theme-1',
      status: ThemeStatus.PRIVATE,
      authorId: 'user-1',
    } as unknown as ThemeWithAuthor;

    await useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'theme-1' });

    expect(appliedTheme).toBeTruthy();
  });

  it('should throw ForbiddenException when resume does not belong to user', async () => {
    foundResume = { id: 'resume-1', userId: 'other-user' };

    await expect(
      useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'theme-1' }),
    ).rejects.toThrow(ForbiddenException);
    expect(appliedTheme).toBeNull();
  });

  it('should throw ForbiddenException when resume is not found', async () => {
    foundResume = null;

    await expect(
      useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'theme-1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException when theme is not accessible', async () => {
    foundTheme = null;

    await expect(
      useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'theme-1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when theme is unpublished and not owned by user', async () => {
    foundTheme = {
      id: 'theme-1',
      status: ThemeStatus.PRIVATE,
      authorId: 'other-user',
    } as unknown as ThemeWithAuthor;

    await expect(
      useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'theme-1' }),
    ).rejects.toThrow(NotFoundException);
  });
});
