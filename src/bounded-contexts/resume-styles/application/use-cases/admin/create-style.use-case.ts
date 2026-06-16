import { LoggerPort } from '@/shared-kernel';
import { StyleBelowAtsThresholdError } from '../../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../../domain/ports/resume-style.repository.port';
import { StyleScorerPort } from '../../../domain/ports/style-scorer.port';
import { type CreateStyleInput, STYLE_SCORE_MIN, type StyleDetail } from '../../../domain/types';

/**
 * Admin-only style creation. The scorer computes a real Style Score from
 * the submitted styleConfig (data-driven rubric), and creation is rejected
 * (`422 STYLE_BELOW_ATS_THRESHOLD`) when the score is below the configured
 * minimum (`STYLE_SCORE_MIN`).
 */
export class CreateStyleUseCase {
  constructor(
    private readonly repo: ResumeStyleRepositoryPort,
    private readonly scorer: StyleScorerPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: CreateStyleInput): Promise<StyleDetail> {
    const result = await this.scorer.score({
      styleConfig: input.styleConfig,
      layoutKind: input.layoutKind,
    });
    if (result.overall < STYLE_SCORE_MIN) {
      throw new StyleBelowAtsThresholdError(result.overall, STYLE_SCORE_MIN);
    }
    return this.repo.create({
      ...input,
      styleScore: result.overall,
      styleScoreBreakdown: { buckets: result.breakdown, issues: result.issues },
    });
  }
}
