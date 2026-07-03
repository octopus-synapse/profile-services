import type { ComputeMatchUseCase } from './application/use-cases/compute-match.use-case';
import type { ComputeReadinessUseCase } from './application/use-cases/compute-readiness.use-case';
import type { GetMeScoresUseCase } from './application/use-cases/get-me-scores.use-case';

/**
 * Route bundle token for the job-match BC. Grew from a single
 * `ComputeMatchUseCase` to a small bundle once Readiness + the unified
 * scores endpoint joined the context.
 */
export interface JobMatchBundle {
  readonly computeMatch: ComputeMatchUseCase;
  readonly computeReadiness: ComputeReadinessUseCase;
  readonly getMeScores: GetMeScoresUseCase;
}
