/**
 * Theme ATS Scoring Strategy
 *
 * Calculates ATS compatibility score for theme configurations.
 * Evaluates layout, typography, colors, visual elements, and section order.
 *
 * Score Range: 0-100
 * - 80-100: ATS-Friendly
 * - 60-79: ATS-Compatible
 * - 0-59: ATS-Risky
 */

import { Injectable } from '@nestjs/common';
import type {
  ThemeATSScoreBreakdown,
  ThemeStyleConfig,
} from '../interfaces/theme-ats-scoring.interface';
import {
  ATS_OPTIMAL_SECTION_ORDER,
  ATS_SAFE_FONTS,
  THEME_ATS_SCORE_WEIGHTS,
} from '../interfaces/theme-ats-scoring.interface';

@Injectable()
export class ThemeATSScoringStrategy {
  /**
   * Score a theme's style configuration for ATS compatibility
   */
  score(styleConfig: ThemeStyleConfig): ThemeATSScoreBreakdown {
    return {
      layout: this.scoreLayout(styleConfig),
      typography: this.scoreTypography(styleConfig),
      colorContrast: this.scoreColorContrast(styleConfig),
      visualElements: this.scoreVisualElements(styleConfig),
      sectionOrder: this.scoreSectionOrder(styleConfig),
      paperSize: this.scorePaperSize(styleConfig),
      margins: this.scoreMargins(styleConfig),
      density: this.scoreDensity(styleConfig),
    };
  }

  /**
   * Calculate overall score from breakdown
   */
  calculateOverallScore(breakdown: ThemeATSScoreBreakdown): number {
    return (
      breakdown.layout.score +
      breakdown.typography.score +
      breakdown.colorContrast.score +
      breakdown.visualElements.score +
      breakdown.sectionOrder.score +
      breakdown.paperSize.score +
      breakdown.margins.score +
      breakdown.density.score
    );
  }

  /**
   * Generate improvement recommendations based on score breakdown
   */
  generateRecommendations(breakdown: ThemeATSScoreBreakdown): string[] {
    const recommendations: string[] = [];

    // Layout recommendations
    if (breakdown.layout.score < THEME_ATS_SCORE_WEIGHTS.LAYOUT) {
      recommendations.push(
        'Use a single-column layout for maximum ATS compatibility. Two-column layouts may confuse parsers.',
      );
    }

    // Typography recommendations
    if (breakdown.typography.score < THEME_ATS_SCORE_WEIGHTS.TYPOGRAPHY) {
      recommendations.push(
        'Use ATS-safe fonts like Arial, Calibri, or Times New Roman for better parsing accuracy.',
      );
    }

    // Color recommendations
    if (breakdown.colorContrast.score < THEME_ATS_SCORE_WEIGHTS.COLOR_CONTRAST) {
      recommendations.push(
        'Use high-contrast colors (black text on white background) for reliable text extraction.',
      );
    }

    // Visual elements recommendations
    if (breakdown.visualElements.score < THEME_ATS_SCORE_WEIGHTS.VISUAL_ELEMENTS) {
      recommendations.push(
        'Minimize visual effects (shadows, gradients, rounded corners) as they do not improve ATS parsing.',
      );
    }

    // Section order recommendations
    if (breakdown.sectionOrder.score < THEME_ATS_SCORE_WEIGHTS.SECTION_ORDER) {
      recommendations.push(
        'Place sections in standard order: Contact → Summary → Work Experience → Education → Skills.',
      );
    }

    // Margins recommendations
    if (breakdown.margins.score < 4) {
      recommendations.push('Use normal or wide margins for better readability and parsing.');
    }

    return recommendations;
  }

  // ============================================================================
  // Private Scoring Methods
  // ============================================================================

  private scoreLayout(config: ThemeStyleConfig): ThemeATSScoreBreakdown['layout'] {
    const { type } = config.layout;
    const maxScore = THEME_ATS_SCORE_WEIGHTS.LAYOUT;

    if (type === 'single-column') {
      return {
        score: maxScore,
        maxScore,
        details: 'Single-column layout (optimal for ATS parsing)',
      };
    }

    // Two-column gets lower score
    return {
      score: 10,
      maxScore,
      details: 'Two-column layout (may confuse some ATS parsers)',
    };
  }

  private scoreTypography(config: ThemeStyleConfig): ThemeATSScoreBreakdown['typography'] {
    const { fontFamily } = config.tokens.typography;
    const maxScore = THEME_ATS_SCORE_WEIGHTS.TYPOGRAPHY;

    const headingFont = fontFamily.heading.toLowerCase();
    const bodyFont = fontFamily.body.toLowerCase();

    const headingSafe = this.isFontATSSafe(headingFont);
    const bodySafe = this.isFontATSSafe(bodyFont);

    if (headingSafe && bodySafe) {
      return {
        score: maxScore,
        maxScore,
        details: `ATS-safe fonts: ${fontFamily.heading}, ${fontFamily.body}`,
      };
    }

    if (headingSafe || bodySafe) {
      return {
        score: 15,
        maxScore,
        details: `Mixed fonts: one ATS-safe (${headingSafe ? fontFamily.heading : fontFamily.body}), one custom`,
      };
    }

    return {
      score: 10,
      maxScore,
      details: `Non-standard fonts: ${fontFamily.heading}, ${fontFamily.body}. Consider Arial or Calibri.`,
    };
  }

  private isFontATSSafe(font: string): boolean {
    return ATS_SAFE_FONTS.some((safeFont) => font.includes(safeFont));
  }

  private scoreColorContrast(config: ThemeStyleConfig): ThemeATSScoreBreakdown['colorContrast'] {
    const { colors } = config.tokens.colors;
    const maxScore = THEME_ATS_SCORE_WEIGHTS.COLOR_CONTRAST;

    const textPrimary = colors.text.primary.toLowerCase();
    const background = colors.background.toLowerCase();

    // Check if high contrast (dark text on light background)
    const isDarkText = this.isColorDark(textPrimary);
    const isLightBackground = !this.isColorDark(background);

    if (isDarkText && isLightBackground) {
      // Check if text is pure black or near-black
      if (this.isNearBlack(textPrimary)) {
        return {
          score: maxScore,
          maxScore,
          details: 'High contrast: dark text on light background (optimal)',
        };
      }
      return {
        score: maxScore,
        maxScore,
        details: 'High contrast: dark text on light background',
      };
    }

    // Colored text
    return {
      score: 5,
      maxScore,
      details: 'Colored text detected. ATS may have difficulty with low-contrast colors.',
    };
  }

  private isColorDark(hex: string): boolean {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return false;
    // Luminance formula
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  }

  private isNearBlack(hex: string): boolean {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return false;
    // Near black if all components are below 50
    return rgb.r < 50 && rgb.g < 50 && rgb.b < 50;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private scoreVisualElements(
    config: ThemeStyleConfig,
  ): ThemeATSScoreBreakdown['visualElements'] {
    const { shadows, borderRadius, gradients } = config.tokens.colors;
    const maxScore = THEME_ATS_SCORE_WEIGHTS.VISUAL_ELEMENTS;

    const hasShadows = shadows && shadows !== 'none';
    const hasBorderRadius = borderRadius && borderRadius !== 'none';
    const hasGradients = gradients?.enabled === true;

    // Heavy visual effects
    if (hasGradients) {
      return {
        score: 0,
        maxScore,
        details: 'Heavy visual effects (gradients enabled). These do not help ATS parsing.',
      };
    }

    if (hasShadows && hasBorderRadius) {
      return {
        score: 5,
        maxScore,
        details: 'Visual effects present (shadows and rounded corners).',
      };
    }

    if (hasShadows || hasBorderRadius) {
      return {
        score: 10,
        maxScore,
        details: hasShadows
          ? 'Shadows present but no border radius.'
          : 'Border radius present but no shadows.',
      };
    }

    return {
      score: maxScore,
      maxScore,
      details: 'Minimal visual effects (optimal for ATS).',
    };
  }

  private scoreSectionOrder(config: ThemeStyleConfig): ThemeATSScoreBreakdown['sectionOrder'] {
    const { sections } = config;
    const maxScore = THEME_ATS_SCORE_WEIGHTS.SECTION_ORDER;

    if (!sections || sections.length === 0) {
      return {
        score: maxScore,
        maxScore,
        details: 'No sections defined (will use default order).',
      };
    }

    // Sort sections by order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    // Check for sidebar placement (ATS issue)
    const sidebarSections = sortedSections.filter((s) => s.column === 'sidebar');
    const hasSidebarContent =
      sidebarSections.length > 0 &&
      sidebarSections.some((s) => this.isImportantSection(s.id));

    if (hasSidebarContent) {
      return {
        score: 8,
        maxScore,
        details: 'Important sections in sidebar column. ATS may parse columns out of order.',
      };
    }

    // Check if work experience comes before education
    const workIndex = sortedSections.findIndex((s) => this.isSectionType(s.id, 'work_experience'));
    const eduIndex = sortedSections.findIndex((s) => this.isSectionType(s.id, 'education'));

    if (workIndex > -1 && eduIndex > -1 && eduIndex < workIndex) {
      return {
        score: 12,
        maxScore,
        details: 'Education before Work Experience. Standard order is Work Experience first.',
      };
    }

    // Check overall order alignment
    const orderScore = this.calculateOrderAlignment(sortedSections);

    if (orderScore >= 0.9) {
      return {
        score: maxScore,
        maxScore,
        details: 'Optimal section order for ATS parsing.',
      };
    }

    if (orderScore >= 0.7) {
      return {
        score: 12,
        maxScore,
        details: 'Good section order with minor deviations.',
      };
    }

    return {
      score: 10,
      maxScore,
      details: 'Section order could be improved for better ATS parsing.',
    };
  }

  private isImportantSection(sectionId: string): boolean {
    const important = ['work_experience', 'education', 'skill', 'summary'];
    return important.some((imp) => sectionId.toLowerCase().includes(imp));
  }

  private isSectionType(sectionId: string, type: string): boolean {
    return sectionId.toLowerCase().includes(type);
  }

  private calculateOrderAlignment(sections: { id: string; order: number }[]): number {
    if (sections.length === 0) return 1;

    let correctPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        const sectionI = this.getSectionPriority(sections[i].id);
        const sectionJ = this.getSectionPriority(sections[j].id);

        if (sectionI !== -1 && sectionJ !== -1) {
          totalPairs++;
          if (sectionI < sectionJ) {
            correctPairs++;
          }
        }
      }
    }

    return totalPairs === 0 ? 1 : correctPairs / totalPairs;
  }

  private getSectionPriority(sectionId: string): number {
    const id = sectionId.toLowerCase();
    for (let i = 0; i < ATS_OPTIMAL_SECTION_ORDER.length; i++) {
      if (id.includes(ATS_OPTIMAL_SECTION_ORDER[i])) {
        return i;
      }
    }
    return -1;
  }

  private scorePaperSize(config: ThemeStyleConfig): ThemeATSScoreBreakdown['paperSize'] {
    const { paperSize } = config.layout;
    const maxScore = THEME_ATS_SCORE_WEIGHTS.PAPER_SIZE;

    const standardSizes = ['a4', 'letter', 'us-letter'];
    const isStandard = standardSizes.includes(paperSize.toLowerCase());

    if (isStandard) {
      return {
        score: maxScore,
        maxScore,
        details: `Standard paper size: ${paperSize}`,
      };
    }

    return {
      score: 3,
      maxScore,
      details: `Non-standard paper size: ${paperSize}. Use A4 or Letter for best compatibility.`,
    };
  }

  private scoreMargins(config: ThemeStyleConfig): ThemeATSScoreBreakdown['margins'] {
    const { margins } = config.layout;
    const maxScore = THEME_ATS_SCORE_WEIGHTS.MARGINS;

    const marginScores: Record<string, number> = {
      normal: 5,
      wide: 4,
      relaxed: 3,
      narrow: 2,
      tight: 2,
    };

    const score = marginScores[margins.toLowerCase()] ?? 3;

    return {
      score,
      maxScore,
      details: `Margins: ${margins}${score === maxScore ? ' (optimal)' : ''}`,
    };
  }

  private scoreDensity(config: ThemeStyleConfig): ThemeATSScoreBreakdown['density'] {
    const { density } = config.tokens.spacing;
    const maxScore = THEME_ATS_SCORE_WEIGHTS.DENSITY;

    const densityScores: Record<string, number> = {
      comfortable: 5,
      spacious: 4,
      normal: 4,
      compact: 3,
      dense: 2,
    };

    const score = densityScores[density.toLowerCase()] ?? 3;

    return {
      score,
      maxScore,
      details: `Density: ${density}${score === maxScore ? ' (optimal for readability)' : ''}`,
    };
  }
}
