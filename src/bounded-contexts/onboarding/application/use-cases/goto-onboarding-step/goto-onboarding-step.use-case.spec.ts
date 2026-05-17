import { beforeEach, describe, expect, it } from 'bun:test';
import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
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

    useCase = new GotoOnboardingStepUseCase(
      saveProgressFn,
      getProgressFn,
      sectionTypeDef,
      stubLogger,
    );
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
      createOnboardingProgress({ userId: USER_ID, currentStep: 'welcome', completedSteps: [] }),
    );

    // Act & Assert
    await expect(useCase.execute(USER_ID, 'nonexistent-step')).rejects.toThrow(ValidationException);
    await expect(useCase.execute(USER_ID, 'nonexistent-step')).rejects.toThrow(
      'Unknown step: nonexistent-step',
    );
  });

  // P1 #26 — was previously "allows jumping to any step (non-linear flow)";
  // the bug fix tightens goto to only allow forward jumps of exactly +1.
  it('rejects skipping multiple steps forward (state-machine guard)', async () => {
    progressRepo.seedProgress(
      createOnboardingProgress({ userId: USER_ID, currentStep: 'welcome', completedSteps: [] }),
    );

    await expect(useCase.execute(USER_ID, 'professional-profile')).rejects.toThrow(
      ValidationException,
    );
  });

  it('allows advancing exactly one step forward', async () => {
    progressRepo.seedProgress(
      createOnboardingProgress({ userId: USER_ID, currentStep: 'welcome', completedSteps: [] }),
    );

    const result = await useCase.execute(USER_ID, 'personal-info');
    expect(result.currentStep).toBe('personal-info');
  });

  it('navigates to a section step when it is the next sequential step', async () => {
    // Arrange — currentStep points at the last canonical step before
    // section:work_experience_v1; section: steps come last in
    // buildOnboardingSteps so a +1 hop works.
    progressRepo.seedProgress(
      createOnboardingProgress({
        userId: USER_ID,
        currentStep: 'section:work_experience_v1',
        completedSteps: ['welcome', 'personal-info', 'username', 'professional-profile'],
      }),
    );

    // Going back to a completed earlier step is allowed.
    const result = await useCase.execute(USER_ID, 'welcome');
    expect(result.currentStep).toBe('welcome');
  });
});
