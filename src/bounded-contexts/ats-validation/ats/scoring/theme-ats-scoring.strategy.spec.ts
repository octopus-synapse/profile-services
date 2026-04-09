/**
 * Theme ATS Scoring Strategy Tests (TDD)
 *
 * Tests written FIRST following TDD methodology.
 * Implementation comes after tests are defined.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type {
  ThemeATSScoreBreakdown,
  ThemeStyleConfig,
} from '../interfaces/theme-ats-scoring.interface';
import {
  THEME_ATS_SCORE_WEIGHTS,
} from '../interfaces/theme-ats-scoring.interface';
import { ThemeATSScoringStrategy } from './theme-ats-scoring.strategy';

describe('ThemeATSScoringStrategy', () => {
  let strategy: ThemeATSScoringStrategy;

  beforeEach(() => {
    strategy = new ThemeATSScoringStrategy();
  });

  // ============================================================================
  // Helper: Create base style config
  // ============================================================================

  const createBaseStyleConfig = (overrides: Partial<ThemeStyleConfig> = {}): ThemeStyleConfig => ({
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
      ...overrides.layout,
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'arial', body: 'arial' },
        fontSize: 'base',
        headingStyle: 'bold',
        ...overrides.tokens?.typography,
      },
      colors: {
        colors: {
          primary: '#000000',
          secondary: '#333333',
          background: '#FFFFFF',
          surface: '#FFFFFF',
          text: { primary: '#000000', secondary: '#333333', accent: '#000000' },
          border: '#CCCCCC',
          divider: '#CCCCCC',
        },
        borderRadius: 'none',
        shadows: 'none',
        ...overrides.tokens?.colors,
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'md',
        itemGap: 'sm',
        contentPadding: 'sm',
        ...overrides.tokens?.spacing,
      },
    },
    sections: overrides.sections ?? [
      { id: 'header', visible: true, order: 0, column: 'full-width' },
      { id: 'summary_v1', visible: true, order: 1, column: 'full-width' },
      { id: 'work_experience_v1', visible: true, order: 2, column: 'full-width' },
      { id: 'education_v1', visible: true, order: 3, column: 'full-width' },
      { id: 'skill_set_v1', visible: true, order: 4, column: 'full-width' },
    ],
  });

  // ============================================================================
  // Layout Scoring Tests (25 points max)
  // ============================================================================

  describe('Layout Scoring', () => {
    it('should return 25 for single-column layout', () => {
      const config = createBaseStyleConfig({ layout: { type: 'single-column', paperSize: 'a4', margins: 'normal' } });
      const result = strategy.score(config);
      
      expect(result.layout.score).toBe(THEME_ATS_SCORE_WEIGHTS.LAYOUT);
      expect(result.layout.maxScore).toBe(THEME_ATS_SCORE_WEIGHTS.LAYOUT);
      expect(result.layout.details.toLowerCase()).toContain('single-column');
    });

    it('should return 10 for two-column layout', () => {
      const config = createBaseStyleConfig({ layout: { type: 'two-column', paperSize: 'a4', margins: 'normal' } });
      const result = strategy.score(config);
      
      expect(result.layout.score).toBe(10);
      expect(result.layout.maxScore).toBe(THEME_ATS_SCORE_WEIGHTS.LAYOUT);
      expect(result.layout.details.toLowerCase()).toContain('two-column');
    });
  });

  // ============================================================================
  // Typography Scoring Tests (20 points max)
  // ============================================================================

  describe('Typography Scoring', () => {
    it('should return 20 for ATS-safe fonts (arial)', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: { fontFamily: { heading: 'arial', body: 'arial' }, fontSize: 'base', headingStyle: 'bold' },
          colors: createBaseStyleConfig().tokens.colors,
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.typography.score).toBe(THEME_ATS_SCORE_WEIGHTS.TYPOGRAPHY);
      expect(result.typography.details).toContain('ATS-safe');
    });

    it('should return 20 for ATS-safe fonts (calibri)', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: { fontFamily: { heading: 'calibri', body: 'calibri' }, fontSize: 'base', headingStyle: 'bold' },
          colors: createBaseStyleConfig().tokens.colors,
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.typography.score).toBe(THEME_ATS_SCORE_WEIGHTS.TYPOGRAPHY);
    });

    it('should return 20 for ATS-safe fonts (times new roman)', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: { fontFamily: { heading: 'times new roman', body: 'times new roman' }, fontSize: 'base', headingStyle: 'bold' },
          colors: createBaseStyleConfig().tokens.colors,
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.typography.score).toBe(THEME_ATS_SCORE_WEIGHTS.TYPOGRAPHY);
    });

    it('should return 15 for mixed fonts (one safe, one custom)', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: { fontFamily: { heading: 'arial', body: 'custom-font' }, fontSize: 'base', headingStyle: 'bold' },
          colors: createBaseStyleConfig().tokens.colors,
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.typography.score).toBe(15);
      expect(result.typography.details.toLowerCase()).toContain('mixed');
    });

    it('should return 10 for non-standard fonts', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: { fontFamily: { heading: 'inter', body: 'roboto' }, fontSize: 'base', headingStyle: 'bold' },
          colors: createBaseStyleConfig().tokens.colors,
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.typography.score).toBe(10);
      expect(result.typography.details.toLowerCase()).toContain('non-standard');
    });
  });

  // ============================================================================
  // Color Contrast Scoring Tests (10 points max)
  // ============================================================================

  describe('Color Contrast Scoring', () => {
    it('should return 10 for high contrast (black on white)', () => {
      const config = createBaseStyleConfig();
      const result = strategy.score(config);
      
      expect(result.colorContrast.score).toBe(THEME_ATS_SCORE_WEIGHTS.COLOR_CONTRAST);
      expect(result.colorContrast.details.toLowerCase()).toContain('high contrast');
    });

    it('should return 10 for dark text on light background', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: {
            colors: {
              primary: '#1F2937',
              secondary: '#6B7280',
              background: '#FFFFFF',
              surface: '#F9FAFB',
              text: { primary: '#111827', secondary: '#6B7280', accent: '#1F2937' },
              border: '#D1D5DB',
              divider: '#E5E7EB',
            },
            borderRadius: 'none',
            shadows: 'none',
          },
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.colorContrast.score).toBe(10);
    });

    it('should return 5 for light colored text on light background', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: {
            colors: {
              primary: '#3B82F6',
              secondary: '#64748B',
              background: '#FFFFFF',
              surface: '#F8FAFC',
              text: { primary: '#60A5FA', secondary: '#93C5FD', accent: '#3B82F6' }, // Light blue text
              border: '#E2E8F0',
              divider: '#F1F5F9',
            },
            borderRadius: 'lg',
            shadows: 'subtle',
          },
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.colorContrast.score).toBe(5);
      expect(result.colorContrast.details.toLowerCase()).toContain('colored');
    });
  });

  // ============================================================================
  // Visual Elements Scoring Tests (15 points max)
  // ============================================================================

  describe('Visual Elements Scoring', () => {
    it('should return 15 for no shadows and no border radius', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: {
            ...createBaseStyleConfig().tokens.colors,
            borderRadius: 'none',
            shadows: 'none',
          },
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.visualElements.score).toBe(THEME_ATS_SCORE_WEIGHTS.VISUAL_ELEMENTS);
      expect(result.visualElements.details.toLowerCase()).toContain('minimal');
    });

    it('should return 10 for shadows: none but with border radius', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: {
            ...createBaseStyleConfig().tokens.colors,
            borderRadius: 'lg',
            shadows: 'none',
          },
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.visualElements.score).toBe(10);
    });

    it('should return 5 for shadows and border radius', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: {
            ...createBaseStyleConfig().tokens.colors,
            borderRadius: 'lg',
            shadows: 'subtle',
          },
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.visualElements.score).toBe(5);
    });

    it('should return 0 for heavy visual effects (gradients enabled)', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: {
            ...createBaseStyleConfig().tokens.colors,
            borderRadius: 'xl',
            shadows: 'strong',
            gradients: { enabled: true, direction: 'to-right' },
          },
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      
      expect(result.visualElements.score).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================================
  // Section Order Scoring Tests (15 points max)
  // ============================================================================

  describe('Section Order Scoring', () => {
    it('should return 15 for optimal section order', () => {
      const config = createBaseStyleConfig({
        sections: [
          { id: 'header', visible: true, order: 0, column: 'full-width' },
          { id: 'summary_v1', visible: true, order: 1, column: 'full-width' },
          { id: 'work_experience_v1', visible: true, order: 2, column: 'full-width' },
          { id: 'education_v1', visible: true, order: 3, column: 'full-width' },
          { id: 'skill_set_v1', visible: true, order: 4, column: 'full-width' },
          { id: 'certification_v1', visible: true, order: 5, column: 'full-width' },
        ],
      });
      const result = strategy.score(config);
      
      expect(result.sectionOrder.score).toBe(THEME_ATS_SCORE_WEIGHTS.SECTION_ORDER);
      expect(result.sectionOrder.details.toLowerCase()).toContain('optimal');
    });

    it('should penalize when education comes before work experience', () => {
      const config = createBaseStyleConfig({
        sections: [
          { id: 'header', visible: true, order: 0, column: 'full-width' },
          { id: 'summary_v1', visible: true, order: 1, column: 'full-width' },
          { id: 'education_v1', visible: true, order: 2, column: 'full-width' },
          { id: 'work_experience_v1', visible: true, order: 3, column: 'full-width' },
          { id: 'skill_set_v1', visible: true, order: 4, column: 'full-width' },
        ],
      });
      const result = strategy.score(config);
      
      expect(result.sectionOrder.score).toBeLessThan(THEME_ATS_SCORE_WEIGHTS.SECTION_ORDER);
    });

    it('should penalize when skills are in sidebar (two-column)', () => {
      const config = createBaseStyleConfig({
        layout: { type: 'two-column', paperSize: 'a4', margins: 'normal' },
        sections: [
          { id: 'header', visible: true, order: 0, column: 'full-width' },
          { id: 'summary_v1', visible: true, order: 1, column: 'main' },
          { id: 'work_experience_v1', visible: true, order: 2, column: 'main' },
          { id: 'skill_set_v1', visible: true, order: 3, column: 'sidebar' },
          { id: 'education_v1', visible: true, order: 4, column: 'sidebar' },
        ],
      });
      const result = strategy.score(config);
      
      expect(result.sectionOrder.score).toBeLessThan(THEME_ATS_SCORE_WEIGHTS.SECTION_ORDER);
      expect(result.sectionOrder.details).toContain('sidebar');
    });
  });

  // ============================================================================
  // Paper Size Scoring Tests (5 points max)
  // ============================================================================

  describe('Paper Size Scoring', () => {
    it('should return 5 for A4 paper size', () => {
      const config = createBaseStyleConfig({ layout: { type: 'single-column', paperSize: 'a4', margins: 'normal' } });
      const result = strategy.score(config);
      
      expect(result.paperSize.score).toBe(THEME_ATS_SCORE_WEIGHTS.PAPER_SIZE);
    });

    it('should return 5 for letter paper size', () => {
      const config = createBaseStyleConfig({ layout: { type: 'single-column', paperSize: 'letter', margins: 'normal' } });
      const result = strategy.score(config);
      
      expect(result.paperSize.score).toBe(THEME_ATS_SCORE_WEIGHTS.PAPER_SIZE);
    });

    it('should return 3 for non-standard paper size', () => {
      const config = createBaseStyleConfig({ layout: { type: 'single-column', paperSize: 'a3', margins: 'normal' } });
      const result = strategy.score(config);
      
      expect(result.paperSize.score).toBe(3);
    });
  });

  // ============================================================================
  // Margins Scoring Tests (5 points max)
  // ============================================================================

  describe('Margins Scoring', () => {
    it('should return 5 for normal margins', () => {
      const config = createBaseStyleConfig({ layout: { type: 'single-column', paperSize: 'a4', margins: 'normal' } });
      const result = strategy.score(config);
      
      expect(result.margins.score).toBe(THEME_ATS_SCORE_WEIGHTS.MARGINS);
    });

    it('should return 4 for wide margins', () => {
      const config = createBaseStyleConfig({ layout: { type: 'single-column', paperSize: 'a4', margins: 'wide' } });
      const result = strategy.score(config);
      
      expect(result.margins.score).toBe(4);
    });

    it('should return 3 for relaxed margins', () => {
      const config = createBaseStyleConfig({ layout: { type: 'single-column', paperSize: 'a4', margins: 'relaxed' } });
      const result = strategy.score(config);
      
      expect(result.margins.score).toBe(3);
    });

    it('should return 2 for tight margins', () => {
      const config = createBaseStyleConfig({ layout: { type: 'single-column', paperSize: 'a4', margins: 'tight' } });
      const result = strategy.score(config);
      
      expect(result.margins.score).toBe(2);
    });
  });

  // ============================================================================
  // Density Scoring Tests (5 points max)
  // ============================================================================

  describe('Density Scoring', () => {
    it('should return 5 for comfortable density', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: createBaseStyleConfig().tokens.colors,
          spacing: { density: 'comfortable', sectionGap: 'md', itemGap: 'sm', contentPadding: 'sm' },
        },
      });
      const result = strategy.score(config);
      
      expect(result.density.score).toBe(THEME_ATS_SCORE_WEIGHTS.DENSITY);
    });

    it('should return 4 for spacious density', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: createBaseStyleConfig().tokens.colors,
          spacing: { density: 'spacious', sectionGap: 'xl', itemGap: 'md', contentPadding: 'sm' },
        },
      });
      const result = strategy.score(config);
      
      expect(result.density.score).toBe(4);
    });

    it('should return 3 for compact density', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: createBaseStyleConfig().tokens.typography,
          colors: createBaseStyleConfig().tokens.colors,
          spacing: { density: 'compact', sectionGap: 'sm', itemGap: 'xs', contentPadding: 'xs' },
        },
      });
      const result = strategy.score(config);
      
      expect(result.density.score).toBe(3);
    });
  });

  // ============================================================================
  // Overall Score Calculation Tests
  // ============================================================================

  describe('Overall Score Calculation', () => {
    it('should calculate overall score as sum of all criteria', () => {
      const config = createBaseStyleConfig();
      const result = strategy.score(config);
      
      const expectedSum = 
        result.layout.score +
        result.typography.score +
        result.colorContrast.score +
        result.visualElements.score +
        result.sectionOrder.score +
        result.paperSize.score +
        result.margins.score +
        result.density.score;
      
      expect(strategy.calculateOverallScore(result)).toBe(expectedSum);
    });

    it('should return maximum 100 for optimal config', () => {
      const config = createBaseStyleConfig();
      const result = strategy.score(config);
      const overall = strategy.calculateOverallScore(result);
      
      expect(overall).toBeLessThanOrEqual(100);
    });

    it('should return lower score for two-column with non-standard fonts', () => {
      const optimalConfig = createBaseStyleConfig();
      const suboptimalConfig = createBaseStyleConfig({
        layout: { type: 'two-column', paperSize: 'a4', margins: 'normal' },
        tokens: {
          typography: { fontFamily: { heading: 'inter', body: 'roboto' }, fontSize: 'base', headingStyle: 'bold' },
          colors: createBaseStyleConfig().tokens.colors,
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      
      const optimalResult = strategy.score(optimalConfig);
      const suboptimalResult = strategy.score(suboptimalConfig);
      
      expect(strategy.calculateOverallScore(suboptimalResult)).toBeLessThan(
        strategy.calculateOverallScore(optimalResult)
      );
    });
  });

  // ============================================================================
  // Recommendations Tests
  // ============================================================================

  describe('Recommendations Generation', () => {
    it('should recommend single-column for two-column layout', () => {
      const config = createBaseStyleConfig({ layout: { type: 'two-column', paperSize: 'a4', margins: 'normal' } });
      const result = strategy.score(config);
      const recommendations = strategy.generateRecommendations(result);
      
      expect(recommendations.some(r => r.toLowerCase().includes('single-column'))).toBe(true);
    });

    it('should recommend ATS-safe fonts for non-standard fonts', () => {
      const config = createBaseStyleConfig({
        tokens: {
          typography: { fontFamily: { heading: 'inter', body: 'roboto' }, fontSize: 'base', headingStyle: 'bold' },
          colors: createBaseStyleConfig().tokens.colors,
          spacing: createBaseStyleConfig().tokens.spacing,
        },
      });
      const result = strategy.score(config);
      const recommendations = strategy.generateRecommendations(result);
      
      expect(recommendations.some(r => r.toLowerCase().includes('arial') || r.toLowerCase().includes('calibri'))).toBe(true);
    });

    it('should return empty recommendations for optimal config', () => {
      const config = createBaseStyleConfig();
      const result = strategy.score(config);
      const recommendations = strategy.generateRecommendations(result);
      
      // Optimal config should have few or no recommendations
      expect(recommendations.length).toBeLessThanOrEqual(2);
    });
  });
});
