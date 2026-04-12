import type { AtsScore } from '../value-objects/ats-score';

export interface ThemeForScoring {
  id: string;
  tokens: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

export interface ResumeForScoring {
  id: string;
  sections: Array<{
    sectionTypeKey: string;
    semanticKind: string;
    itemCount: number;
    hasContent: boolean;
  }>;
  hasSummary: boolean;
  hasSkills: boolean;
}

export abstract class ThemeScorerPort {
  abstract scoreTheme(theme: ThemeForScoring): AtsScore;
}

export abstract class ResumeScorerPort {
  abstract scoreResume(resume: ResumeForScoring): AtsScore;
}

export const THEME_SCORER = Symbol('THEME_SCORER');
export const RESUME_SCORER = Symbol('RESUME_SCORER');
