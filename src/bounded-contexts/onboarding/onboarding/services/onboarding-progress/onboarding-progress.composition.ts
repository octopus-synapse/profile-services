import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ONBOARDING_PROGRESS_USE_CASES,
  type OnboardingProgressUseCases,
} from './ports/onboarding-progress.port';
import { OnboardingProgressRepository } from './repository/onboarding-progress.repository';
import { DeleteProgressUseCase } from './use-cases/delete-progress.use-case';
import { GetProgressUseCase } from './use-cases/get-progress.use-case';
import { SaveProgressUseCase } from './use-cases/save-progress.use-case';

export { ONBOARDING_PROGRESS_USE_CASES };

export function buildOnboardingProgressUseCases(prisma: PrismaService): OnboardingProgressUseCases {
  const repository = new OnboardingProgressRepository(prisma);

  return {
    saveProgressUseCase: new SaveProgressUseCase(repository),
    getProgressUseCase: new GetProgressUseCase(repository),
    deleteProgressUseCase: new DeleteProgressUseCase(repository),
  };
}
