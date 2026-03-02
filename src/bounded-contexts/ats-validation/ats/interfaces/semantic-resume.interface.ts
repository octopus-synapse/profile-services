import type { SectionKind, SemanticFieldValue } from '@/shared-kernel/dtos/semantic-sections.dto';

export const SECTION_SEMANTIC_CATALOG = Symbol('SECTION_SEMANTIC_CATALOG');

export interface SemanticSectionItem {
  sectionTypeKey: string;
  sectionTypeVersion: number;
  sectionKind: SectionKind;
  values: SemanticFieldValue[];
}

export interface SemanticResumeSnapshot {
  resumeId: string;
  items: SemanticSectionItem[];
}

export interface SectionSemanticCatalogPort {
  getSemanticResumeSnapshot(resumeId: string): Promise<SemanticResumeSnapshot>;
}
