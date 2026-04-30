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

export abstract class MatchCandidatesForJobPort {
  abstract execute(input: MatchCandidatesForJobInput): Promise<MatchCandidatesForJobOutput>;
}
