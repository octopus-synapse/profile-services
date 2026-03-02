import { Injectable } from '@nestjs/common';
import type { SemanticResumeSnapshot } from '../interfaces';
import { CertificationScoringStrategy } from './certification-scoring.strategy';
import { DefaultScoringStrategy } from './default-scoring.strategy';
import { EducationScoringStrategy } from './education-scoring.strategy';
import type {
  SemanticScoreBreakdown,
  SemanticScoringResult,
  SemanticScoringStrategy,
} from './semantic-scoring-strategy.interface';
import { WorkExperienceScoringStrategy } from './work-experience-scoring.strategy';

@Injectable()
export class SemanticScoringService {
  private readonly strategies: Map<string, SemanticScoringStrategy>;

  constructor(
    workExperienceScoring: WorkExperienceScoringStrategy,
    educationScoring: EducationScoringStrategy,
    certificationScoring: CertificationScoringStrategy,
    private readonly defaultScoring: DefaultScoringStrategy,
  ) {
    const strategyList: SemanticScoringStrategy[] = [
      workExperienceScoring,
      educationScoring,
      certificationScoring,
    ];

    this.strategies = new Map(strategyList.map((strategy) => [strategy.kind, strategy]));
  }

  score(snapshot: SemanticResumeSnapshot): SemanticScoringResult {
    if (snapshot.items.length === 0) {
      return {
        score: 0,
        breakdown: [],
      };
    }

    const breakdown: SemanticScoreBreakdown[] = snapshot.items.map((item) => {
      const strategy = this.strategies.get(item.sectionKind);
      const score = strategy ? strategy.score(item) : this.defaultScoring.score(item);

      return {
        sectionTypeKey: item.sectionTypeKey,
        sectionKind: item.sectionKind,
        score,
      };
    });

    const averageScore = Math.round(
      breakdown.reduce((total, entry) => total + entry.score, 0) / breakdown.length,
    );

    return {
      score: averageScore,
      breakdown,
    };
  }
}
