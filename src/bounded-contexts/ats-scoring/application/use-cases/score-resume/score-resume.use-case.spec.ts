import { describe, expect, it } from 'bun:test';
import { AtsScore } from '../../../domain/value-objects/ats-score';
import type { AtsScoreBreakdown } from '../../../domain/value-objects/ats-score';
import type {
  ResumeForScoring,
  ResumeScorerPort,
} from '../../../domain/ports/ats-scorer.port';
import { ScoreResumeUseCase } from './score-resume.use-case';

const makeBreakdown = (): AtsScoreBreakdown[] => [
  { criterion: 'sections', score: 85, weight: 0.4 },
  { criterion: 'completeness', score: 60, weight: 0.4, recommendation: 'Add a summary section' },
  { criterion: 'skills', score: 95, weight: 0.2 },
];

const makeResume = (): ResumeForScoring => ({
  id: 'resume-1',
  sections: [
    { sectionTypeKey: 'work_exp_v1', semanticKind: 'WORK_EXPERIENCE', itemCount: 3, hasContent: true },
    { sectionTypeKey: 'education_v1', semanticKind: 'EDUCATION', itemCount: 2, hasContent: true },
  ],
  hasSummary: false,
  hasSkills: true,
});

class StubResumeScorer implements ResumeScorerPort {
  private result: AtsScore;

  constructor(result: AtsScore) {
    this.result = result;
  }

  scoreResume(_resume: ResumeForScoring): AtsScore {
    return this.result;
  }
}

describe('ScoreResumeUseCase', () => {
  it('should delegate scoring to ResumeScorerPort', () => {
    const breakdown = makeBreakdown();
    const expected = AtsScore.fromBreakdown(breakdown);
    const scorer = new StubResumeScorer(expected);
    const useCase = new ScoreResumeUseCase(scorer);

    const result = useCase.execute(makeResume());

    expect(result).toBe(expected);
  });

  it('should return the AtsScore from the scorer', () => {
    const expected = new AtsScore(55, [], ['Add more sections']);
    const scorer = new StubResumeScorer(expected);
    const useCase = new ScoreResumeUseCase(scorer);

    const result = useCase.execute(makeResume());

    expect(result.overall).toBe(55);
    expect(result.recommendations).toEqual(['Add more sections']);
  });

  it('should pass the resume to the scorer', () => {
    let capturedResume: ResumeForScoring | undefined;

    const scorer: ResumeScorerPort = {
      scoreResume(resume: ResumeForScoring): AtsScore {
        capturedResume = resume;
        return new AtsScore(80, [], []);
      },
    };

    const useCase = new ScoreResumeUseCase(scorer);
    const resume = makeResume();
    useCase.execute(resume);

    expect(capturedResume).toEqual(resume);
  });
});
