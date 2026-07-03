import { scoreToRank } from '@/shared-kernel/scoring';
import type { MeScoresView } from '../../application/use-cases/get-me-scores.use-case';
import type { ScoreTrendRead } from '../../domain/ports/scores-read.port';
import type { MeScoresResponseDto } from '../../dto/me-scores.schema';

function trend(points: readonly ScoreTrendRead[]): MeScoresResponseDto['readiness']['trend'] {
  // Oldest → newest so charts read left-to-right.
  return [...points]
    .sort((a, b) => a.computedAt.getTime() - b.computedAt.getTime())
    .map((p) => ({ score: p.score, at: p.computedAt.toISOString() }));
}

export function toMeScoresResponseDto(view: MeScoresView): MeScoresResponseDto {
  const readiness = view.readiness.breakdown;
  return {
    resumeId: view.resumeId,
    rank: view.rank,
    readiness: {
      score: readiness.overallScore,
      rank: scoreToRank(readiness.overallScore),
      factors: {
        quality: readiness.factors.quality.score,
        coverage: readiness.factors.coverage.score,
        fit: readiness.factors.fit.score,
      },
      trend: trend(view.readiness.trend),
    },
    quality: view.quality
      ? {
          score: view.quality.latest.overallScore,
          rank: scoreToRank(view.quality.latest.overallScore),
          completenessScore: view.quality.latest.completenessScore,
          contentQualityScore: view.quality.latest.contentQualityScore,
          computedAt: view.quality.latest.computedAt.toISOString(),
          trend: trend(view.quality.trend),
        }
      : null,
    style: view.style ? { score: view.style.score, rank: scoreToRank(view.style.score) } : null,
    fit: {
      status: view.fit.status,
      expiresAt: view.fit.expiresAt ? view.fit.expiresAt.toISOString() : null,
    },
  };
}
