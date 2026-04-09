import { beforeEach, describe, expect, it } from 'bun:test';
import { OnboardingValidationException } from '../../../domain/exceptions/onboarding.exceptions';
import {
  createOnboardingProgress,
  InMemoryOnboardingCompletion,
  InMemoryOnboardingProgressRepository,
} from '../../../testing';
import { GetProgressUseCase } from '../get-progress/get-progress.use-case';
import type { GetProgressFn } from '../shared/navigation.types';
import {
  type CompleteOnboardingExecutor,
  CompleteOnboardingFromProgressUseCase,
} from './complete-onboarding-from-progress.use-case';

describe('CompleteOnboardingFromProgressUseCase', () => {
  let useCase: CompleteOnboardingFromProgressUseCase;
  let progressRepo: InMemoryOnboardingProgressRepository;
  let completion: InMemoryOnboardingCompletion;
  let getProgressFn: GetProgressFn;

  const USER_ID = 'user-complete-1';

  beforeEach(() => {
    progressRepo = new InMemoryOnboardingProgressRepository();
    completion = new InMemoryOnboardingCompletion();

    const getUseCase = new GetProgressUseCase(progressRepo);
    getProgressFn = (userId) => getUseCase.execute(userId);

    const executor: CompleteOnboardingExecutor = {
      execute: (userId, data) => completion.executeCompletion(userId, data as never),
    };

    useCase = new CompleteOnboardingFromProgressUseCase(getProgressFn, executor);
  });

  it('completes onboarding with valid progress data', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: [
          'welcome',
          'personal-info',
          'username',
          'professional-profile',
          'template',
        ],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: { jobTitle: 'Engineer' },
        templateSelection: { colorScheme: 'ocean' },
        sections: [
          {
            sectionTypeKey: 'work_experience_v1',
            items: [{ content: { company: 'Acme' } }],
            noData: false,
          },
        ],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.resumeId).toBeDefined();
    expect(typeof result.resumeId).toBe('string');

    const stored = completion.getCompletion(USER_ID);
    expect(stored).toBeDefined();
    expect(stored?.data.username).toBe('johndoe');
  });

  it('maps sections correctly from progress', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: [
          'welcome',
          'personal-info',
          'username',
          'professional-profile',
          'template',
        ],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: { jobTitle: 'Engineer' },
        templateSelection: { colorScheme: 'ocean' },
        sections: [
          {
            sectionTypeKey: 'work_experience_v1',
            items: [{ content: { company: 'Acme', role: 'Dev' } }],
            noData: false,
          },
          {
            sectionTypeKey: 'education_v1',
            items: [],
            noData: true,
          },
        ],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.resumeId).toBeDefined();
    const stored = completion.getCompletion(USER_ID);
    expect(stored?.data.sections).toHaveLength(2);
  });

  it('throws when username is missing', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome'],
        username: null,
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: { jobTitle: 'Engineer' },
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingValidationException);
  });

  it('throws when personalInfo is missing', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome'],
        username: 'johndoe',
        personalInfo: null,
        professionalProfile: { jobTitle: 'Engineer' },
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingValidationException);
  });

  it('throws when professionalProfile is missing', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: null,
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingValidationException);
  });

  it('throws when personalInfo.fullName is missing', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome'],
        username: 'johndoe',
        personalInfo: { email: 'john@example.com' }, // missing fullName
        professionalProfile: { jobTitle: 'Engineer' },
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingValidationException);
  });

  it('throws when personalInfo.email is invalid', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'not-an-email' }, // invalid email
        professionalProfile: { jobTitle: 'Engineer' },
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingValidationException);
  });

  it('throws when professionalProfile.jobTitle is missing', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: { summary: 'No job title' }, // missing jobTitle
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingValidationException);
  });

  it('defaults templateSelection to empty object when missing', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: { jobTitle: 'Engineer' },
        templateSelection: null,
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert — should succeed with default empty templateSelection
    expect(result.resumeId).toBeDefined();
    const stored = completion.getCompletion(USER_ID);
    expect(stored?.data.templateSelection).toEqual({});
  });

  it('handles empty sections gracefully', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: { jobTitle: 'Engineer' },
        sections: [],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert
    expect(result.resumeId).toBeDefined();
    const stored = completion.getCompletion(USER_ID);
    expect(stored?.data.sections).toEqual([]);
  });
});
