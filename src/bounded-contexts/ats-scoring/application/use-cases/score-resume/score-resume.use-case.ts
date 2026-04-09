import type { AtsScore } from '../../../domain/value-objects/ats-score';
import type {
  ResumeForScoring,
  ResumeScorerPort,
} from '../../../domain/ports/ats-scorer.port';

export class ScoreResumeUseCase {
  constructor(private readonly scorer: ResumeScorerPort) {}

  execute(resume: ResumeForScoring): AtsScore {
    return this.scorer.scoreResume(resume);
  }
}
