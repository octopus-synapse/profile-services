import type { MatchBreakdown } from '../../domain/types';
import type { MatchBreakdownDto } from '../../dto/match-breakdown.schema';

const SUB_SCORE_LABELS: Record<keyof MatchBreakdown['subScores'], string> = {
  keyword: 'Keyword Match',
  requirements: 'Requirements',
  semantic: 'Semantic Fit',
  fit: 'Personality Fit',
};

export interface JobMatchSimpleDto {
  readonly score: number;
  readonly matchedKeywords: readonly string[];
  readonly missingKeywords: readonly string[];
  readonly dimensions: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly value: number;
  }>;
}

/**
 * Frontend-friendly projection of `MatchBreakdown` for
 * `POST /v1/jobs/:id/match`. Collapses the four sub-scores into a
 * `dimensions[]` array (chart-ready) and hoists the keyword detail to
 * top-level since that's what the candidate-side UI surfaces.
 */
export function toJobMatchSimpleResponseDto(b: MatchBreakdown): JobMatchSimpleDto {
  const dimensions: JobMatchSimpleDto['dimensions'] = (
    Object.keys(SUB_SCORE_LABELS) as Array<keyof MatchBreakdown['subScores']>
  )
    .filter((k) => b.subScores[k].score !== null)
    .map((k) => ({
      key: k,
      label: SUB_SCORE_LABELS[k],
      value: (b.subScores[k].score ?? 0) / 100,
    }));

  const keywordDetail = b.subScores.keyword.detail as
    | { matched?: readonly string[]; missing?: readonly string[] }
    | undefined;

  return {
    score: b.overallScore,
    matchedKeywords: keywordDetail?.matched ?? [],
    missingKeywords: keywordDetail?.missing ?? [],
    dimensions,
  };
}

export function toMatchBreakdownResponseDto(b: MatchBreakdown): MatchBreakdownDto {
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
