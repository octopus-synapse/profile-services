/**
 * Theme ATS Scoring Interfaces
 *
 * Defines contracts for scoring themes based on ATS compatibility.
 * Theme scoring evaluates visual/structural properties, NOT content.
 *
 * Score Range: 0-100
 * - 80-100: ATS-Friendly (optimal for parser compatibility)
 * - 60-79: ATS-Compatible (some issues may occur)
 * - 0-59: ATS-Risky (high chance of parsing problems)
 */

// ============================================================================
// Theme Style Config Types (matches prisma styleConfig JSON)
// ============================================================================

export interface ThemeLayoutConfig {
  type: 'single-column' | 'two-column';
  paperSize: string;
  margins: string;
  columnDistribution?: string;
  pageBreakBehavior?: string;
  showPageNumbers?: boolean;
  pageNumberPosition?: string;
}

export interface ThemeTypographyConfig {
  fontFamily: {
    heading: string;
    body: string;
  };
  fontSize: string;
  headingStyle: string;
}

export interface ThemeColorsConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      accent: string;
    };
    border: string;
    divider: string;
  };
  borderRadius: string;
  shadows: string;
  gradients?: {
    enabled: boolean;
    direction: string;
  };
}

export interface ThemeSpacingConfig {
  density: string;
  sectionGap: string;
  itemGap: string;
  contentPadding: string;
}

export interface ThemeSectionConfig {
  id: string;
  visible: boolean;
  order: number;
  column: string;
}

export interface ThemeStyleConfig {
  version: string;
  layout: ThemeLayoutConfig;
  tokens: {
    typography: ThemeTypographyConfig;
    colors: ThemeColorsConfig;
    spacing: ThemeSpacingConfig;
  };
  sections: ThemeSectionConfig[];
}

// ============================================================================
// Scoring Result Types
// ============================================================================

export interface ThemeATSScoreCriterion {
  score: number;
  maxScore: number;
  details: string;
}

export interface ThemeATSScoreBreakdown {
  layout: ThemeATSScoreCriterion;
  typography: ThemeATSScoreCriterion;
  colorContrast: ThemeATSScoreCriterion;
  visualElements: ThemeATSScoreCriterion;
  sectionOrder: ThemeATSScoreCriterion;
  paperSize: ThemeATSScoreCriterion;
  margins: ThemeATSScoreCriterion;
  density: ThemeATSScoreCriterion;
}

export interface ThemeATSScoreResult {
  themeId: string;
  themeName: string;
  overallScore: number;
  breakdown: ThemeATSScoreBreakdown;
  recommendations: string[];
  isATSFriendly: boolean;
}

// ============================================================================
// Port Interface
// ============================================================================

export const THEME_ATS_PORT = Symbol('THEME_ATS_PORT');

export interface ThemeForATSScoring {
  id: string;
  name: string;
  styleConfig: ThemeStyleConfig;
}

export interface ThemeATSPort {
  getThemeById(themeId: string): Promise<ThemeForATSScoring | null>;
}

// ============================================================================
// Scoring Constants
// ============================================================================

export const THEME_ATS_SCORE_WEIGHTS = {
  LAYOUT: 25,
  TYPOGRAPHY: 20,
  COLOR_CONTRAST: 10,
  VISUAL_ELEMENTS: 15,
  SECTION_ORDER: 15,
  PAPER_SIZE: 5,
  MARGINS: 5,
  DENSITY: 5,
} as const;

export const ATS_SAFE_FONTS = [
  'arial',
  'calibri',
  'times',
  'times new roman',
  'helvetica',
  'georgia',
  'verdana',
  'tahoma',
  'trebuchet',
  'garamond',
  'cambria',
] as const;

export const ATS_OPTIMAL_SECTION_ORDER = [
  'header',
  'summary',
  'work_experience',
  'education',
  'skill',
  'certification',
  'language',
  'project',
] as const;
