import { beforeEach, describe, expect, it } from 'bun:test';

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EventPublisher } from '@/shared-kernel';
import { createTestTheme, InMemoryThemeRepository } from '../../../testing';
import type { ResumeRepositoryPort } from '../../domain/ports/resume.repository.port';
import { ApplyThemeToResumeUseCase } from './apply-theme-to-resume.use-case';

describe('ApplyThemeToResumeUseCase', () => {
  let useCase: ApplyThemeToResumeUseCase;
  let themeRepo: InMemoryThemeRepository;
  let foundResume: { id: string; userId: string } | null;
  let appliedTheme: { resumeId: string; themeId: string } | null;
  let publishedEvents: unknown[];

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
    themeRepo = new InMemoryThemeRepository();
    themeRepo.seed([createTestTheme({ id: 'theme-1' })]);
    foundResume = { id: 'resume-1', userId: 'user-1' };
    appliedTheme = null;
    publishedEvents = [];
    useCase = new ApplyThemeToResumeUseCase(themeRepo, resumeRepo, eventPublisher);
  });

  it('should apply a theme to a resume', async () => {
    await useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'theme-1' });

    expect(appliedTheme).toEqual({ resumeId: 'resume-1', themeId: 'theme-1' });
    expect(publishedEvents).toHaveLength(1);
  });

  it('should increment theme usage count', async () => {
    await useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'theme-1' });

    const theme = await themeRepo.findById('theme-1');
    expect(theme?.usageCount).toBe(1);
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

  it('should throw NotFoundException when theme does not exist', async () => {
    await expect(
      useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'nonexistent' }),
    ).rejects.toThrow(NotFoundException);
  });
});
