import { EntityNotFoundException, ERROR_MESSAGES } from '@/shared-kernel';
import type {
  OnboardingRepositoryPort,
  OnboardingStatus,
} from '../../../domain/ports/onboarding.port';

export class GetOnboardingStatusUseCase {
  constructor(private readonly repository: OnboardingRepositoryPort) {}

  async execute(userId: string): Promise<OnboardingStatus> {
    const status = await this.repository.getOnboardingStatus(userId);

    if (!status) {
      throw new EntityNotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return status;
  }
}
