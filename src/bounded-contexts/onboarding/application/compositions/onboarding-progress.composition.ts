import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { OnboardingProgressUseCases } from '../../domain/ports/onboarding-progress.port';
import { OnboardingProgressRepository } from '../../infrastructure/adapters/persistence/onboarding-progress.repository';
import { DeleteProgressUseCase } from '../use-cases/delete-progress/delete-progress.use-case';
import { GetProgressUseCase } from '../use-cases/get-progress/get-progress.use-case';
import { SaveProgressUseCase } from '../use-cases/save-progress/save-progress.use-case';

export { OnboardingProgressUseCases };

export function buildOnboardingProgressUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
): OnboardingProgressUseCases {
  const repository = new OnboardingProgressRepository(prisma, logger);

  return {
    saveProgressUseCase: new SaveProgressUseCase(repository),
    getProgressUseCase: new GetProgressUseCase(repository),
    deleteProgressUseCase: new DeleteProgressUseCase(repository),
  };
}
