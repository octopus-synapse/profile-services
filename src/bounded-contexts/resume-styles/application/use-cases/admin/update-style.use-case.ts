import {
  StyleBelowAtsThresholdError,
  StyleNotEditableError,
  StyleNotFoundError,
  StyleScoreRegressionError,
} from '../../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../../domain/ports/resume-style.repository.port';
import { StyleScorerPort } from '../../../domain/ports/style-scorer.port';
import { ATS_SAFE_THRESHOLD, type StyleDetail, type UpdateStylePatch } from '../../../domain/types';

/**
 * Admin-only style update.
 *
 * - System-managed styles (`isSystem: true`) are never editable from
 *   the API; ops mutate them via the seed file + a fresh deploy.
 * - When `styleConfig` changes we rerun the scorer and enforce the
 *   ATS-safety threshold (invariant 3).
 * - Monotonic styleScore (invariant 1) is double-enforced: a clean
 *   422 here, a Postgres trigger as the last line of defence.
 */
export class UpdateStyleUseCase {
  constructor(
    private readonly repo: ResumeStyleRepositoryPort,
    private readonly scorer: StyleScorerPort,
  ) {}

  async execute(id: string, patch: UpdateStylePatch): Promise<StyleDetail> {
    const current = await this.repo.findById(id);
    if (!current) throw new StyleNotFoundError(id);
    if (current.isSystem) throw new StyleNotEditableError(id);

    let styleScore: number | undefined;
    let atsSafetyBreakdown: Record<string, number> | undefined;
    if (patch.styleConfig) {
      const breakdown = this.scorer.score(patch.styleConfig);
      styleScore = this.scorer.calculateOverallScore(breakdown);
      if (styleScore < ATS_SAFE_THRESHOLD) {
        throw new StyleBelowAtsThresholdError(styleScore, ATS_SAFE_THRESHOLD);
      }
      if (styleScore < current.styleScore) {
        throw new StyleScoreRegressionError(id, current.styleScore, styleScore);
      }
      atsSafetyBreakdown = { ...breakdown };
    }

    return this.repo.update(id, { ...patch, styleScore, atsSafetyBreakdown });
  }
}
