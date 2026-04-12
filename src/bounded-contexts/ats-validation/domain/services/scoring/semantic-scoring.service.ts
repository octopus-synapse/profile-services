import { Injectable } from '@nestjs/common';
import type { SemanticResumeSnapshot } from '../../interfaces';
import { DefinitionDrivenScoringStrategy } from './definition-driven-scoring.strategy';
import type {
  SemanticScoreBreakdown,
  SemanticScoringResult,
} from './semantic-scoring-strategy.interface';

/**
 * Semantic Scoring Service
 *
 * Orchestrates scoring using ONE definition-driven strategy.
 * No per-type strategy classes — scoring config lives in the DB.
 */
@Injectable()
export class SemanticScoringService {
  constructor(private readonly scorer: DefinitionDrivenScoringStrategy) {}

  score(snapshot: SemanticResumeSnapshot): SemanticScoringResult {
    if (snapshot.items.length === 0) {
      return {
        score: 0,
        breakdown: [],
      };
    }

    // Build a lookup from kind → ATS config using the catalog
    const catalogByKind = new Map(snapshot.sectionTypeCatalog.map((entry) => [entry.kind, entry]));

    const breakdown: SemanticScoreBreakdown[] = snapshot.items.map((item) => {
      const catalogEntry = catalogByKind.get(item.sectionKind);

      const atsConfig = catalogEntry?.ats ?? {
        isMandatory: false,
        recommendedPosition: 99,
        scoring: { baseScore: 30, fieldWeights: {} },
      };

      const score = this.scorer.score({ item, atsConfig });

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
