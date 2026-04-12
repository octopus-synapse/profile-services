import { beforeEach, describe, expect, it } from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import {
  createOnboardingProgress,
  DEFAULT_SECTION_TYPES,
  InMemoryOnboardingProgressRepository,
  InMemorySectionTypeDefinition,
} from '../../../testing';
import { GetProgressUseCase } from '../get-progress/get-progress.use-case';
import { SaveProgressUseCase } from '../save-progress/save-progress.use-case';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';
import { GoBackOnboardingStepUseCase } from './go-back-onboarding-step.use-case';

describe('GoBackOnboardingStepUseCase', () => {
  let useCase: GoBackOnboardingStepUseCase;
  let progressRepo: InMemoryOnboardingProgressRepository;
  let sectionTypeDef: InMemorySectionTypeDefinition;
  let saveProgressFn: SaveProgressFn;
  let getProgressFn: GetProgressFn;

  const USER_ID = 'user-goback-1';

  beforeEach(() => {
    progressRepo = new InMemoryOnboardingProgressRepository();
    sectionTypeDef = new InMemorySectionTypeDefinition();
    sectionTypeDef.seedSectionTypes(DEFAULT_SECTION_TYPES);

    const saveUseCase = new SaveProgressUseCase(progressRepo);
    const getUseCase = new GetProgressUseCase(progressRepo);
    saveProgressFn = (userId, data) => saveUseCase.execute(userId, data);
    getProgressFn = (userId) => getUseCase.execute(userId);

    useCase = new GoBackOnboardingStepUseCase(saveProgressFn, getProgressFn, sectionTypeDef);
  });

  it('goes back from personal-info to welcome', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.currentStep).toBe('welcome');
    expect(result.completedSteps).toContain('welcome');
  });

  it('throws when already at the first step', async () => {
    // Arrange — user at welcome (first step), no progress record = initial state

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(USER_ID)).rejects.toThrow('Already at the first step');
  });

  it('preserves completedSteps when going back', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'username',
        completedSteps: ['welcome', 'personal-info'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.currentStep).toBe('personal-info');
    expect(result.completedSteps).toEqual(expect.arrayContaining(['welcome', 'personal-info']));
  });

  it('goes back from a section step to professional-profile', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'section:work_experience_v1',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.currentStep).toBe('professional-profile');
  });

  it('goes back between section steps', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'section:education_v1',
        completedSteps: [
          'welcome',
          'personal-info',
          'username',
          'professional-profile',
          'section:work_experience_v1',
        ],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.currentStep).toBe('section:work_experience_v1');
  });

  it('goes back from template to last section step', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'template',
        completedSteps: [
          'welcome',
          'personal-info',
          'username',
          'professional-profile',
          'section:work_experience_v1',
          'section:education_v1',
          'section:skill_set_v1',
          'section:language_v1',
        ],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.currentStep).toBe('section:language_v1');
  });
});
