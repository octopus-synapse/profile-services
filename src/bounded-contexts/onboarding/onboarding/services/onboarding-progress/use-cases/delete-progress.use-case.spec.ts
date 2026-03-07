import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { OnboardingProgressRepositoryPort } from '../ports/onboarding-progress.port';
import { DeleteProgressUseCase } from './delete-progress.use-case';

describe('DeleteProgressUseCase', () => {
  let useCase: DeleteProgressUseCase;
  let repository: OnboardingProgressRepositoryPort;

  beforeEach(() => {
    repository = {
      findProgressByUserId: mock(async () => null),
      upsertProgress: mock(async () => ({
        currentStep: 'welcome',
        completedSteps: [],
      })),
      deleteProgress: mock(async () => undefined),
      deleteProgressWithTx: mock(async () => undefined),
      findUserByUsername: mock(async () => null),
    } as OnboardingProgressRepositoryPort;

    useCase = new DeleteProgressUseCase(repository);
  });

  it('deletes progress and returns void', async () => {
    const result = await useCase.execute('user-1');

    expect(repository.deleteProgress).toHaveBeenCalledWith('user-1');
    expect(result).toBeUndefined();
  });
});
