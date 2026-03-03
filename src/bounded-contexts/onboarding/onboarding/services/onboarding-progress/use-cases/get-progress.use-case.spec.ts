import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { GetProgressUseCase, INITIAL_PROGRESS } from './get-progress.use-case';
import type { OnboardingProgressRepositoryPort } from '../ports/onboarding-progress.port';

describe('GetProgressUseCase', () => {
  let useCase: GetProgressUseCase;
  let repository: OnboardingProgressRepositoryPort;

  const mockProgress = {
    userId: 'user-1',
    currentStep: 'personal-info',
    completedSteps: ['welcome'],
    username: 'johndoe',
    personalInfo: { fullName: 'John Doe' },
    professionalProfile: null,
    experiences: [],
    noExperience: false,
    education: [],
    noEducation: false,
    skills: [],
    noSkills: false,
    languages: [],
    templateSelection: null,
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = {
      findProgressByUserId: mock(async () => mockProgress),
      upsertProgress: mock(async () => ({
        currentStep: 'welcome',
        completedSteps: [],
      })),
      deleteProgress: mock(async () => undefined),
      deleteProgressWithTx: mock(async () => undefined),
      findUserByUsername: mock(async () => null),
    } as OnboardingProgressRepositoryPort;

    useCase = new GetProgressUseCase(repository);
  });

  it('returns progress data for user', async () => {
    const result = await useCase.execute('user-1');

    expect(repository.findProgressByUserId).toHaveBeenCalledWith('user-1');
    expect(result.currentStep).toBe('personal-info');
    expect(result.completedSteps).toEqual(['welcome']);
    expect(result.username).toBe('johndoe');
  });

  it('returns initial progress when no progress exists', async () => {
    repository.findProgressByUserId = mock(async () => null);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(INITIAL_PROGRESS);
  });

  it('deletes and returns initial progress when expired', async () => {
    const expiredProgress = {
      ...mockProgress,
      updatedAt: new Date(Date.now() - 37 * 60 * 60 * 1000), // 37 hours ago
    };
    repository.findProgressByUserId = mock(async () => expiredProgress);

    const result = await useCase.execute('user-1');

    expect(repository.deleteProgress).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(INITIAL_PROGRESS);
  });
});
