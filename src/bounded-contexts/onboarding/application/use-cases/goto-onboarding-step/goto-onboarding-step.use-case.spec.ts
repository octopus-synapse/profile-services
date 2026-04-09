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
import { GotoOnboardingStepUseCase } from './goto-onboarding-step.use-case';

describe('GotoOnboardingStepUseCase', () => {
  let useCase: GotoOnboardingStepUseCase;
  let progressRepo: InMemoryOnboardingProgressRepository;
  let sectionTypeDef: InMemorySectionTypeDefinition;
  let saveProgressFn: SaveProgressFn;
  let getProgressFn: GetProgressFn;

  const USER_ID = 'user-goto-1';

  beforeEach(() => {
    progressRepo = new InMemoryOnboardingProgressRepository();
    sectionTypeDef = new InMemorySectionTypeDefinition();
    sectionTypeDef.seedSectionTypes(DEFAULT_SECTION_TYPES);

    const saveUseCase = new SaveProgressUseCase(progressRepo);
    const getUseCase = new GetProgressUseCase(progressRepo);
    saveProgressFn = (userId, data) => saveUseCase.execute(userId, data);
    getProgressFn = (userId) => getUseCase.execute(userId);

    useCase = new GotoOnboardingStepUseCase(saveProgressFn, getProgressFn, sectionTypeDef);
  });

  it('navigates to a completed step', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'username',
        completedSteps: ['welcome', 'personal-info'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, 'welcome');

    // Assert
    expect(result.currentStep).toBe('welcome');
    expect(result.completedSteps).toEqual(expect.arrayContaining(['welcome', 'personal-info']));
  });

  it('navigates to the current step (no-op)', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, 'personal-info');

    // Assert
    expect(result.currentStep).toBe('personal-info');
  });

  it('navigates to a step at or before the current step index', async () => {
    // Arrange — user at username (index 2), navigate to personal-info (index 1)
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'username',
        completedSteps: ['welcome'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, 'personal-info');

    // Assert
    expect(result.currentStep).toBe('personal-info');
  });

  it('throws for an unknown step', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'welcome',
        completedSteps: [],
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID, 'nonexistent-step')).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(USER_ID, 'nonexistent-step')).rejects.toThrow(
      'Unknown step: nonexistent-step',
    );
  });

  it('throws when jumping to a future step that is not completed', async () => {
    // Arrange — user at welcome, trying to jump to professional-profile
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'welcome',
        completedSteps: [],
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID, 'professional-profile')).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute(USER_ID, 'professional-profile')).rejects.toThrow(
      'not accessible yet',
    );
  });

  it('allows jumping to a future step if it was previously completed', async () => {
    // Arrange — user went back but has professional-profile completed
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'welcome',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, 'professional-profile');

    // Assert
    expect(result.currentStep).toBe('professional-profile');
  });

  it('navigates to a section step when accessible', async () => {
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
    const result = await useCase.execute(USER_ID, 'section:work_experience_v1');

    // Assert
    expect(result.currentStep).toBe('section:work_experience_v1');
  });
});
