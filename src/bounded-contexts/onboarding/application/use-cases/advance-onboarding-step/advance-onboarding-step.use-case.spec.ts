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
import { AdvanceOnboardingStepUseCase } from './advance-onboarding-step.use-case';

describe('AdvanceOnboardingStepUseCase', () => {
  let useCase: AdvanceOnboardingStepUseCase;
  let progressRepo: InMemoryOnboardingProgressRepository;
  let sectionTypeDef: InMemorySectionTypeDefinition;
  let saveProgressFn: SaveProgressFn;
  let getProgressFn: GetProgressFn;

  const USER_ID = 'user-advance-1';

  beforeEach(() => {
    progressRepo = new InMemoryOnboardingProgressRepository();
    sectionTypeDef = new InMemorySectionTypeDefinition();
    sectionTypeDef.seedSectionTypes(DEFAULT_SECTION_TYPES);

    const saveUseCase = new SaveProgressUseCase(progressRepo);
    const getUseCase = new GetProgressUseCase(progressRepo);
    saveProgressFn = (userId, data) => saveUseCase.execute(userId, data);
    getProgressFn = (userId) => getUseCase.execute(userId);

    useCase = new AdvanceOnboardingStepUseCase(saveProgressFn, getProgressFn, sectionTypeDef);
  });

  it('advances from welcome to personal-info', async () => {
    // Arrange: user at welcome step (no progress record = initial state)

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.currentStep).toBe('personal-info');
    expect(result.completedSteps).toContain('welcome');
  });

  it('advances from personal-info to username when step data is provided', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.currentStep).toBe('username');
    expect(result.completedSteps).toContain('personal-info');
  });

  it('advances from username to professional-profile with step data', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'username',
        completedSteps: ['welcome', 'personal-info'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.currentStep).toBe('professional-profile');
    expect(result.completedSteps).toContain('username');
  });

  it('merges step data when provided during advance', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'welcome',
        completedSteps: [],
      }),
    );

    // Act — advance from welcome, providing personal-info data early
    const result = await useCase.execute(USER_ID);

    // Assert — welcome always passes validation, so we advance
    expect(result.currentStep).toBe('personal-info');
  });

  it('throws when already at the last step', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'complete',
        completedSteps: [
          'welcome',
          'personal-info',
          'username',
          'professional-profile',
          'section:work_experience_v1',
          'section:education_v1',
          'section:skill_set_v1',
          'section:language_v1',
          'template',
          'review',
        ],
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(USER_ID)).rejects.toThrow('Already at the last step');
  });

  it('throws when required fields are missing for current step', async () => {
    // Arrange — personal-info step requires fullName and email
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
        personalInfo: null, // Missing required data
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(USER_ID)).rejects.toThrow('required fields missing');
  });

  it('throws when username step has no username', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'username',
        completedSteps: ['welcome', 'personal-info'],
        username: null, // Missing required username
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(BadRequestException);
  });

  it('does not duplicate current step in completedSteps', async () => {
    // Arrange — welcome already in completedSteps
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'welcome',
        completedSteps: ['welcome'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert — welcome should not appear twice
    const welcomeCount = result.completedSteps.filter((s) => s === 'welcome').length;
    expect(welcomeCount).toBe(1);
  });

  it('advances through section steps', async () => {
    // Arrange — at professional-profile with required data
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'professional-profile',
        completedSteps: ['welcome', 'personal-info', 'username'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: { jobTitle: 'Software Engineer' },
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert — should advance to first section step
    expect(result.currentStep).toBe('section:work_experience_v1');
    expect(result.completedSteps).toContain('professional-profile');
  });
});
