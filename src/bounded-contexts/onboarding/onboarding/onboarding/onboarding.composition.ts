import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ONBOARDING_USE_CASES, type OnboardingUseCases } from './ports/onboarding.port';
import { OnboardingRepository } from './repository/onboarding.repository';
import { GetOnboardingStatusUseCase } from './use-cases/get-onboarding-status.use-case';

export { ONBOARDING_USE_CASES };

/**
 * Note: completeOnboarding is complex and remains in the main service
 * because it orchestrates multiple sub-services (resume, skills, etc.)
 * Only simpler operations are extracted to use cases.
 */
export function buildOnboardingUseCases(prisma: PrismaService): OnboardingUseCases {
  const repository = new OnboardingRepository(prisma);

  return {
    completeOnboardingUseCase: {
      // This is a placeholder - the actual implementation remains in the main service
      // due to its complexity and dependencies on multiple sub-services
      execute: async () => {
        throw new Error('Use OnboardingService.completeOnboarding directly');
      },
    },
    getOnboardingStatusUseCase: new GetOnboardingStatusUseCase(repository),
  };
}
