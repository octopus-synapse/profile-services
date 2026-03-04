import type { OnboardingProgressRepositoryPort } from '../ports/onboarding-progress.port';

export class DeleteProgressUseCase {
  constructor(private readonly repository: OnboardingProgressRepositoryPort) {}

  async execute(userId: string): Promise<void> {
    await this.repository.deleteProgress(userId);
  }
}
