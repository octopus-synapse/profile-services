import type { SectionKind, SemanticFieldValue } from '@/shared-kernel/dtos/semantic-sections.dto';

export const SECTION_SEMANTIC_CATALOG = Symbol('SECTION_SEMANTIC_CATALOG');

export interface SemanticSectionItem {
  sectionTypeKey: string;
  sectionTypeVersion: number;
  sectionKind: SectionKind;
  values: SemanticFieldValue[];
}

/**
 * ATS configuration entry for a section type.
 * Loaded from the DB definition — never hardcoded.
 */
export interface SectionTypeAtsEntry {
  key: string;
  kind: string;
  ats: {
    isMandatory: boolean;
    recommendedPosition: number;
    scoring: {
      baseScore: number;
      fieldWeights: Record<string, number>;
    };
  };
}

export interface SemanticResumeSnapshot {
  resumeId: string;
  items: SemanticSectionItem[];
  /**
   * All active section types with their ATS config.
   * Scoring, mandatory policy, and ordering policy read from this
   * instead of hardcoding per-type behavior.
   */
  sectionTypeCatalog: SectionTypeAtsEntry[];
}

export interface SectionSemanticCatalogPort {
  getSemanticResumeSnapshot(resumeId: string): Promise<SemanticResumeSnapshot>;
}
