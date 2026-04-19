import { beforeEach, describe, expect, it } from 'bun:test';
import type { EventPublisherPort } from '@/shared-kernel';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { createTestTheme, InMemoryThemeRepository } from '../../../testing';
import { ResumeRepositoryPort } from '../../domain/ports/resume.repository.port';
import { ApplyThemeToResumeUseCase } from './apply-theme-to-resume.use-case';

describe('ApplyThemeToResumeUseCase', () => {
  let useCase: ApplyThemeToResumeUseCase;
  let themeRepo: InMemoryThemeRepository;
  let foundResume: { id: string; userId: string } | null;
  let appliedTheme: { resumeId: string; themeId: string } | null;
  let publishedEvents: unknown[];

  const resumeRepo: ResumeRepositoryPort = {
    findById: async () => foundResume,
    findByIdWithTheme: async () => {
      throw new Error('not used in test');
    },
    applyTheme: async (resumeId: string, themeId: string) => {
      appliedTheme = { resumeId, themeId };
    },
  };

  const eventPublisher: EventPublisherPort = {
    publish: (event: DomainEvent<unknown>) => {
      publishedEvents.push(event);
    },
    publishAsync: async (event: DomainEvent<unknown>) => {
      publishedEvents.push(event);
    },
  };

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

  it('should throw EntityNotFoundException when theme does not exist', async () => {
    await expect(
      useCase.execute('user-1', { resumeId: 'resume-1', themeId: 'nonexistent' }),
    ).rejects.toThrow(EntityNotFoundException);
  });
});
