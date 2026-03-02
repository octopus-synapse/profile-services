import type { SectionKind, SemanticSectionItem } from '@/shared-kernel/dtos/semantic-sections.dto';

export interface SemanticScoringStrategy {
  readonly kind: SectionKind;
  score(item: SemanticSectionItem): number;
}

export interface SemanticScoreBreakdown {
  sectionTypeKey: string;
  sectionKind: SectionKind;
  score: number;
}

export interface SemanticScoringResult {
  score: number;
  breakdown: SemanticScoreBreakdown[];
}
