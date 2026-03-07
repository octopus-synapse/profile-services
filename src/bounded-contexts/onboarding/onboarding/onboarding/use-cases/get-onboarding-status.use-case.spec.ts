import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel';
import type { OnboardingRepositoryPort } from '../ports/onboarding.port';
import { GetOnboardingStatusUseCase } from './get-onboarding-status.use-case';

describe('GetOnboardingStatusUseCase', () => {
  let useCase: GetOnboardingStatusUseCase;
  let repository: OnboardingRepositoryPort;

  beforeEach(() => {
    repository = {
      findUserById: mock(async () => ({
        id: 'user-1',
        hasCompletedOnboarding: false,
      })),
      getOnboardingStatus: mock(async () => ({
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date('2026-01-01'),
      })),
      markOnboardingComplete: mock(async () => undefined),
      executeInTransaction: mock(async (fn) => fn({} as never)),
    } as OnboardingRepositoryPort;

    useCase = new GetOnboardingStatusUseCase(repository);
  });

  it('returns onboarding status for valid user', async () => {
    const result = await useCase.execute('user-1');

    expect(repository.getOnboardingStatus).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      hasCompletedOnboarding: true,
      onboardingCompletedAt: expect.any(Date),
    });
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    repository.getOnboardingStatus = mock(async () => null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(EntityNotFoundException);
  });
});
