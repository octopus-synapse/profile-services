import type { MatchBreakdown } from '../../domain/types';
import type { MatchBreakdownDto } from '../../dto/match-breakdown.dto';

export function presentMatchBreakdown(b: MatchBreakdown): MatchBreakdownDto {
  return {
    overallScore: b.overallScore,
    subScores: {
      keyword: { score: b.subScores.keyword.score, detail: b.subScores.keyword.detail },
      requirements: {
        score: b.subScores.requirements.score,
        detail: b.subScores.requirements.detail,
      },
      semantic: { score: b.subScores.semantic.score, detail: b.subScores.semantic.detail },
      fit: { score: b.subScores.fit.score, detail: b.subScores.fit.detail },
    },
    effectiveWeights: { ...b.effectiveWeights },
    rulesVersion: b.rulesVersion,
    computedAt: b.computedAt.toISOString(),
  };
}
