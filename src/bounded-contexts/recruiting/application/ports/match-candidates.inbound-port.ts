/**
 * Inbound port for the candidate-match use-case.
 *
 * Other bounded contexts (or the HTTP controller) depend on this symbol
 * instead of the concrete `MatchCandidatesForJobUseCase` class, so DI
 * substitutions (tests, future implementations) stay clean.
 */

import type {
  MatchCandidatesForJobInput,
  MatchCandidatesForJobOutput,
} from '../use-cases/match-candidates-for-job/match-candidates-for-job.dto';

export interface MatchCandidatesForJobPort {
  execute(input: MatchCandidatesForJobInput): Promise<MatchCandidatesForJobOutput>;
}

export const MATCH_CANDIDATES_FOR_JOB_PORT = Symbol('MatchCandidatesForJobPort');
