import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  OnboardingStepNotCompletedException,
  OnboardingValidationException,
} from '../../../domain/exceptions/onboarding.exceptions';
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

    useCase = new CompleteOnboardingFromProgressUseCase(getProgressFn, executor, stubLogger);
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
          'resume-style',
        ],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe' },
        professionalProfile: { jobTitle: 'Engineer' },
        resumeStyleId: '019e4a58-581a-7679-9351-df6a83687eed',
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
          'resume-style',
        ],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe' },
        professionalProfile: { jobTitle: 'Engineer' },
        resumeStyleId: '019e4a58-581a-7679-9351-df6a83687eed',
        sections: [
          {
            sectionTypeKey: 'work_experience_v1',
            items: [{ content: { company: 'Acme', role: 'Dev' } }],
            noData: false,
          },
          { sectionTypeKey: 'education_v1', items: [], noData: true },
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

  it('throws OnboardingStepNotCompletedException when a required step is not in completedSteps', async () => {
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        // missing 'username' on purpose
        completedSteps: ['welcome', 'personal-info', 'professional-profile'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe' },
        professionalProfile: { jobTitle: 'Engineer' },
      }),
    );

    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingStepNotCompletedException);
  });

  it('throws when username is missing', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
        username: null,
        personalInfo: { fullName: 'John Doe' },
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
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
        username: 'johndoe',
        personalInfo: null,
        professionalProfile: { jobTitle: 'Engineer' },
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingValidationException);
  });

  it('completes even when professionalProfile is missing (optional since the redesign)', async () => {
    // Arrange — professional-profile data is optional: the resume job
    // title is derived from work experience (deriveJobTitle), so a null
    // profile must NOT block completion.
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe' },
        professionalProfile: null,
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).resolves.toBeDefined();
  });

  it('throws when personalInfo.fullName is missing', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
        username: 'johndoe',
        personalInfo: {}, // missing fullName
        professionalProfile: { jobTitle: 'Engineer' },
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).rejects.toThrow(OnboardingValidationException);
  });

  // 'throws when personalInfo.email is invalid' — REMOVED. The User.email
  // (signup) is the canonical email; there is no separate personalInfo.email
  // field anymore. See onboarding-data.schema.ts.

  it('completes when professionalProfile has no job title (derived from work experience)', async () => {
    // Arrange — jobTitle left the professional-profile step in the
    // redesign; `deriveJobTitle` extracts it from the current work
    // experience with `headline` as fallback.
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe' },
        professionalProfile: { summary: 'No job title' },
      }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID)).resolves.toBeDefined();
  });

  it('passes resumeStyleId=null through when the user skipped the picker', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe' },
        professionalProfile: { jobTitle: 'Engineer' },
        resumeStyleId: null,
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID);

    // Assert — completion picks the default style downstream when null
    expect(result.resumeId).toBeDefined();
    const stored = completion.getCompletion(USER_ID);
    expect(stored?.data.resumeStyleId).toBeNull();
  });

  it('handles empty sections gracefully', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'review',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
        username: 'johndoe',
        personalInfo: { fullName: 'John Doe' },
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
