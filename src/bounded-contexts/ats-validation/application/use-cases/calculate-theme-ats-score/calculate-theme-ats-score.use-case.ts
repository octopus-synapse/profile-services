/**
 * Calculate Theme ATS Score Use Case
 *
 * Calculates and returns the ATS compatibility score for a given theme.
 * Uses ThemeATSScoringStrategy to evaluate theme configuration.
 */

import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  ThemeATSPort,
  ThemeATSScoreResult,
} from '../../../ats/interfaces/theme-ats-scoring.interface';
import { THEME_ATS_PORT } from '../../../ats/interfaces/theme-ats-scoring.interface';
import { ThemeATSScoringStrategy } from '../../../ats/scoring/theme-ats-scoring.strategy';

const ATS_FRIENDLY_THRESHOLD = 80;

@Injectable()
export class CalculateThemeATSScoreUseCase {
  constructor(
    @Inject(THEME_ATS_PORT)
    private readonly themePort: ThemeATSPort,
    private readonly scoringStrategy: ThemeATSScoringStrategy,
  ) {}

  /**
   * Execute the use case: calculate ATS score for a theme
   *
   * @param themeId - The ID of the theme to score
   * @returns ThemeATSScoreResult with breakdown and recommendations
   * @throws NotFoundException if theme does not exist
   */
  async execute(themeId: string): Promise<ThemeATSScoreResult> {
    const theme = await this.themePort.getThemeById(themeId);

    if (!theme) {
      throw new EntityNotFoundException('Theme', themeId);
    }

    const breakdown = this.scoringStrategy.score(theme.styleConfig);
    const overallScore = this.scoringStrategy.calculateOverallScore(breakdown);
    const recommendations = this.scoringStrategy.generateRecommendations(breakdown);
    const isATSFriendly = overallScore >= ATS_FRIENDLY_THRESHOLD;

    return {
      themeId: theme.id,
      themeName: theme.name,
      overallScore,
      breakdown,
      recommendations,
      isATSFriendly,
    };
  }
}
