import { FitAnswerRepositoryPort } from '../../domain/ports/fit-answer.repository.port';
import { UserFitProfileRepositoryPort } from '../../domain/ports/user-fit-profile.repository.port';

/**
 * LGPD-compliant deletion. The user asked for their raw answers to be
 * scrubbed; we oblige by wiping `FitAnswer` rows and clearing the
 * cached vector on `UserFitProfile` (keeping the row so foreign-key
 * invariants hold and so the status endpoint can correctly report
 * `never`). `FitRemapHistory` stays untouched — it's anonymised
 * snapshot telemetry per the plan — but the current vector no longer
 * feeds any Match computation.
 */
export class DeleteFitProfileUseCase {
  constructor(
    private readonly answers: FitAnswerRepositoryPort,
    private readonly profiles: UserFitProfileRepositoryPort,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.answers.deleteByUser(userId);
    await this.profiles.anonymize(userId);
  }
}
