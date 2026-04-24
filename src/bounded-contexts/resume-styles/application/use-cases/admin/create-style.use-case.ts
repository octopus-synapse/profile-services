import { Injectable } from '@nestjs/common';
import { StyleBelowAtsThresholdError } from '../../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../../domain/ports/resume-style.repository.port';
import { StyleScorerPort } from '../../../domain/ports/style-scorer.port';
import { ATS_SAFE_THRESHOLD, type CreateStyleInput, type StyleDetail } from '../../../domain/types';

/**
 * Admin-only style creation with the plan's invariant 3 enforced:
 * the scorer computes a styleScore from the submitted styleConfig,
 * and creation is rejected (`422 style_below_ats_threshold`) when
 * the score is below the configured threshold (default 70).
 */
@Injectable()
export class CreateStyleUseCase {
  constructor(
    private readonly repo: ResumeStyleRepositoryPort,
    private readonly scorer: StyleScorerPort,
  ) {}

  async execute(input: CreateStyleInput): Promise<StyleDetail> {
    const breakdown = this.scorer.score(input.styleConfig);
    const styleScore = this.scorer.calculateOverallScore(breakdown);
    if (styleScore < ATS_SAFE_THRESHOLD) {
      throw new StyleBelowAtsThresholdError(styleScore, ATS_SAFE_THRESHOLD);
    }
    return this.repo.create({
      ...input,
      styleScore,
      atsSafetyBreakdown: { ...breakdown },
    });
  }
}
