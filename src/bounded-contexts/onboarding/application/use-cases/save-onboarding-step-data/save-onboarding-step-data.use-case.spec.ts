import { beforeEach, describe, expect, it } from 'bun:test';
import { createOnboardingProgress, InMemoryOnboardingProgressRepository } from '../../../testing';
import { GetProgressUseCase } from '../get-progress/get-progress.use-case';
import { SaveProgressUseCase } from '../save-progress/save-progress.use-case';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';
import { SaveOnboardingStepDataUseCase } from './save-onboarding-step-data.use-case';

describe('SaveOnboardingStepDataUseCase', () => {
  let useCase: SaveOnboardingStepDataUseCase;
  let progressRepo: InMemoryOnboardingProgressRepository;
  let saveProgressFn: SaveProgressFn;
  let getProgressFn: GetProgressFn;

  const USER_ID = 'user-save-step-1';

  beforeEach(() => {
    progressRepo = new InMemoryOnboardingProgressRepository();

    const saveUseCase = new SaveProgressUseCase(progressRepo);
    const getUseCase = new GetProgressUseCase(progressRepo);
    saveProgressFn = (userId, data) => saveUseCase.execute(userId, data);
    getProgressFn = (userId) => getUseCase.execute(userId);

    useCase = new SaveOnboardingStepDataUseCase(saveProgressFn, getProgressFn);
  });

  it('saves personal-info step data', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
    });

    // Assert
    expect(result.currentStep).toBe('personal-info');
    expect(result.personalInfo).toEqual({ fullName: 'Jane Doe', email: 'jane@example.com' });
  });

  it('saves username step data', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'username',
        completedSteps: ['welcome', 'personal-info'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, { username: 'janedoe' });

    // Assert
    expect(result.username).toBe('janedoe');
  });

  it('saves professional-profile step data', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'professional-profile',
        completedSteps: ['welcome', 'personal-info', 'username'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, {
      jobTitle: 'Product Manager',
      summary: 'Experienced PM',
    });

    // Assert
    expect(result.professionalProfile).toEqual({
      jobTitle: 'Product Manager',
      summary: 'Experienced PM',
    });
  });

  it('saves template step data', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'template',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, {
      templateId: 'MINIMAL',
      colorScheme: 'dark',
    });

    // Assert
    expect(result.templateSelection).toEqual({ templateId: 'MINIMAL', colorScheme: 'dark' });
  });

  it('saves section step data', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'section:work_experience_v1',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
        sections: [],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, {
      items: [{ content: { company: 'Acme', role: 'Engineer' } }],
      noData: false,
    });

    // Assert
    expect(result.sections).toEqual([
      {
        sectionTypeKey: 'work_experience_v1',
        items: [{ content: { company: 'Acme', role: 'Engineer' } }],
        noData: false,
      },
    ]);
  });

  it('preserves existing step and completedSteps', async () => {
    // Arrange
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, {
      fullName: 'John',
      email: 'john@test.com',
    });

    // Assert — step and completedSteps should not change
    expect(result.currentStep).toBe('personal-info');
    expect(result.completedSteps).toContain('welcome');
  });

  it('replaces section data for the same section type', async () => {
    // Arrange — existing section data
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'section:work_experience_v1',
        completedSteps: ['welcome'],
        sections: [
          {
            sectionTypeKey: 'work_experience_v1',
            items: [{ content: { company: 'OldCo' } }],
            noData: false,
          },
          {
            sectionTypeKey: 'education_v1',
            items: [{ content: { school: 'MIT' } }],
            noData: false,
          },
        ],
      }),
    );

    // Act
    const result = await useCase.execute(USER_ID, {
      items: [{ content: { company: 'NewCo' } }],
      noData: false,
    });

    // Assert — work_experience replaced, education preserved
    expect(result.sections).toHaveLength(2);
    const workSection = (
      result.sections as Array<{ sectionTypeKey: string; items: unknown[] }>
    ).find((s) => s.sectionTypeKey === 'work_experience_v1');
    const eduSection = (
      result.sections as Array<{ sectionTypeKey: string; items: unknown[] }>
    ).find((s) => s.sectionTypeKey === 'education_v1');
    expect(workSection?.items).toEqual([{ content: { company: 'NewCo' } }]);
    expect(eduSection?.items).toEqual([{ content: { school: 'MIT' } }]);
  });
});
