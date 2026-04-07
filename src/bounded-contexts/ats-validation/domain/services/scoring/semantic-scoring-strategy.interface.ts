export interface SemanticScoreBreakdown {
  sectionTypeKey: string;
  sectionKind: string;
  score: number;
}

export interface SemanticScoringResult {
  score: number;
  breakdown: SemanticScoreBreakdown[];
}
