import { LoggerPort } from '@/shared-kernel';
import {
  StyleBelowAtsThresholdError,
  StyleNotEditableError,
  StyleNotFoundError,
} from '../../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../../domain/ports/resume-style.repository.port';
import { StyleScorerPort } from '../../../domain/ports/style-scorer.port';
import {
  STYLE_SCORE_MIN,
  type StyleDetail,
  type StyleScoreBreakdownData,
  type UpdateStylePatch,
} from '../../../domain/types';

/**
 * Admin-only style update.
 *
 * - System-managed styles (`isSystem: true`) are never editable from
 *   the API; ops mutate them via the seed file + a fresh deploy.
 * - When `styleConfig` changes we rerun the scorer and enforce the
 *   ATS-safety threshold (`STYLE_SCORE_MIN`). The score is free to move
 *   in either direction — a worse template legitimately scores lower.
 */
export class UpdateStyleUseCase {
  constructor(
    private readonly repo: ResumeStyleRepositoryPort,
    private readonly scorer: StyleScorerPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(id: string, patch: UpdateStylePatch): Promise<StyleDetail> {
    const current = await this.repo.findById(id);
    if (!current) throw new StyleNotFoundError(id);
    if (current.isSystem) throw new StyleNotEditableError(id);

    let styleScore: number | undefined;
    let styleScoreBreakdown: StyleScoreBreakdownData | undefined;
    if (patch.styleConfig) {
      const result = await this.scorer.score({
        styleConfig: patch.styleConfig,
        layoutKind: patch.layoutKind ?? current.layoutKind,
      });
      if (result.overall < STYLE_SCORE_MIN) {
        throw new StyleBelowAtsThresholdError(result.overall, STYLE_SCORE_MIN);
      }
      styleScore = result.overall;
      styleScoreBreakdown = { buckets: result.breakdown, issues: result.issues };
    }

    return this.repo.update(id, { ...patch, styleScore, styleScoreBreakdown });
  }
}
