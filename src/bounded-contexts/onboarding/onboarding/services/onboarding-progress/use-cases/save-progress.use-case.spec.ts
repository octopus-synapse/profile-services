import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ConflictException, ValidationException } from '@/shared-kernel';
import { SaveProgressUseCase } from './save-progress.use-case';
import type { OnboardingProgressRepositoryPort } from '../ports/onboarding-progress.port';

describe('SaveProgressUseCase', () => {
  let useCase: SaveProgressUseCase;
  let repository: OnboardingProgressRepositoryPort;

  beforeEach(() => {
    repository = {
      findProgressByUserId: mock(async () => null),
      upsertProgress: mock(async () => ({
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
      })),
      deleteProgress: mock(async () => undefined),
      deleteProgressWithTx: mock(async () => undefined),
      findUserByUsername: mock(async () => null),
    } as OnboardingProgressRepositoryPort;

    useCase = new SaveProgressUseCase(repository);
  });

  it('saves progress and returns result (not envelope)', async () => {
    const data = {
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
      username: 'johndoe',
    };

    const result = await useCase.execute('user-1', data);

    expect(repository.upsertProgress).toHaveBeenCalled();
    expect(result).toEqual({
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
    });
    // CRITICAL: NO envelope with success
    expect(result).not.toHaveProperty('success');
  });

  it('validates username uniqueness', async () => {
    repository.findUserByUsername = mock(async () => ({ id: 'other-user' }));

    const data = {
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
      username: 'taken_username',
    };

    await expect(useCase.execute('user-1', data)).rejects.toThrow(
      ConflictException,
    );
  });

  it('allows same user to keep their username', async () => {
    repository.findUserByUsername = mock(async () => ({ id: 'user-1' }));

    const data = {
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
      username: 'my_username',
    };

    const result = await useCase.execute('user-1', data);
    expect(result.currentStep).toBe('personal-info');
  });

  it('throws when noExperience is true but experiences provided', async () => {
    const data = {
      currentStep: 'experience',
      completedSteps: ['welcome', 'personal-info'],
      noExperience: true,
      experiences: [{ company: 'Test' }],
    };

    await expect(useCase.execute('user-1', data)).rejects.toThrow(
      ValidationException,
    );
  });

  it('throws when noEducation is true but education provided', async () => {
    const data = {
      currentStep: 'education',
      completedSteps: ['welcome'],
      noEducation: true,
      education: [{ institution: 'Test' }],
    };

    await expect(useCase.execute('user-1', data)).rejects.toThrow(
      ValidationException,
    );
  });

  it('throws when noSkills is true but skills provided', async () => {
    const data = {
      currentStep: 'skills',
      completedSteps: ['welcome'],
      noSkills: true,
      skills: [{ name: 'Test' }],
    };

    await expect(useCase.execute('user-1', data)).rejects.toThrow(
      ValidationException,
    );
  });
});
