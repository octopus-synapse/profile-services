/**
 * Enforce Quality Threshold Use Case
 *
 * Cross-cutting guard for actions that demand a minimum Resume Quality
 * Score (e.g. publishing, export-as-portfolio, applying with one click).
 * Callers pass the resumeId and a threshold; this use case loads the
 * latest snapshot and throws if the score is missing or below the bar.
 *
 * Kept distinct from `GetLatestQualityUseCase` so the read endpoint
 * stays a pure read (returning `null` for "not yet computed") while
 * gating actions get a typed exception with a translated message.
 */

import {
  ResumeQualityAuthenticatedUserMissingException,
  ResumeQualityBelowThresholdException,
  ResumeQualityScoreUnavailableException,
} from '../../domain/exceptions/resume-quality.exceptions';
import { QualityScoreRepositoryPort } from '../../domain/ports/quality-score.repository.port';

export interface EnforceQualityThresholdInput {
  readonly resumeId: string;
  readonly threshold: number;
  /** `undefined` means the route never resolved an authenticated user —
   *  surfaced as a typed 401 rather than letting an `id` lookup NPE below. */
  readonly userId: string | null | undefined;
}

export class EnforceQualityThresholdUseCase {
  constructor(private readonly repository: QualityScoreRepositoryPort) {}

  async execute(input: EnforceQualityThresholdInput): Promise<void> {
    if (!input.userId) {
      throw new ResumeQualityAuthenticatedUserMissingException();
    }

    const snapshot = await this.repository.findLatest(input.resumeId);
    if (!snapshot) {
      throw new ResumeQualityScoreUnavailableException();
    }

    if (snapshot.overallScore < input.threshold) {
      throw new ResumeQualityBelowThresholdException(
        snapshot.overallScore,
        input.threshold,
      );
    }
  }
}
