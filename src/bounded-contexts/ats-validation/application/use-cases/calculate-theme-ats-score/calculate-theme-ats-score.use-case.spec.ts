/**
 * Calculate Theme ATS Score Use Case Tests (TDD)
 *
 * Tests written FIRST following TDD methodology.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import { ThemeATSScoringStrategy } from '../../../ats/scoring/theme-ats-scoring.strategy';
import {
  createOptimalATSThemeConfig,
  createSuboptimalATSThemeConfig,
  InMemoryThemeATSAdapter,
} from '../../../testing';
import { CalculateThemeATSScoreUseCase } from './calculate-theme-ats-score.use-case';

describe('CalculateThemeATSScoreUseCase', () => {
  let useCase: CalculateThemeATSScoreUseCase;
  let themeAdapter: InMemoryThemeATSAdapter;
  let scoringStrategy: ThemeATSScoringStrategy;

  beforeEach(() => {
    themeAdapter = new InMemoryThemeATSAdapter();
    scoringStrategy = new ThemeATSScoringStrategy();
    useCase = new CalculateThemeATSScoreUseCase(themeAdapter, scoringStrategy);
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should throw NotFoundException when theme does not exist', async () => {
      expect(useCase.execute('non-existent-theme')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with descriptive message', async () => {
      try {
        await useCase.execute('missing-theme-id');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toContain('Theme');
      }
    });
  });

  // ============================================================================
  // Score Calculation Tests
  // ============================================================================

  describe('Score Calculation', () => {
    it('should return score result for valid theme', async () => {
      themeAdapter.seed({
        id: 'theme-1',
        name: 'Test Theme',
        styleConfig: createOptimalATSThemeConfig(),
      });

      const result = await useCase.execute('theme-1');

      expect(result).toBeDefined();
      expect(result.themeId).toBe('theme-1');
      expect(result.themeName).toBe('Test Theme');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
    });

    it('should include all breakdown criteria', async () => {
      themeAdapter.seed({
        id: 'theme-1',
        name: 'Test Theme',
        styleConfig: createOptimalATSThemeConfig(),
      });

      const result = await useCase.execute('theme-1');

      expect(result.breakdown.layout).toBeDefined();
      expect(result.breakdown.typography).toBeDefined();
      expect(result.breakdown.colorContrast).toBeDefined();
      expect(result.breakdown.visualElements).toBeDefined();
      expect(result.breakdown.sectionOrder).toBeDefined();
      expect(result.breakdown.paperSize).toBeDefined();
      expect(result.breakdown.margins).toBeDefined();
      expect(result.breakdown.density).toBeDefined();
    });

    it('should return high score for optimal theme config', async () => {
      themeAdapter.seed({
        id: 'optimal-theme',
        name: 'Optimal Theme',
        styleConfig: createOptimalATSThemeConfig(),
      });

      const result = await useCase.execute('optimal-theme');

      expect(result.overallScore).toBeGreaterThanOrEqual(90);
    });

    it('should return lower score for suboptimal theme config', async () => {
      themeAdapter.seed({
        id: 'suboptimal-theme',
        name: 'Suboptimal Theme',
        styleConfig: createSuboptimalATSThemeConfig(),
      });

      const result = await useCase.execute('suboptimal-theme');

      expect(result.overallScore).toBeLessThan(70);
    });
  });

  // ============================================================================
  // ATS-Friendly Flag Tests
  // ============================================================================

  describe('ATS-Friendly Flag', () => {
    it('should mark theme as ATS-friendly when score >= 80', async () => {
      themeAdapter.seed({
        id: 'friendly-theme',
        name: 'Friendly Theme',
        styleConfig: createOptimalATSThemeConfig(),
      });

      const result = await useCase.execute('friendly-theme');

      expect(result.overallScore).toBeGreaterThanOrEqual(80);
      expect(result.isATSFriendly).toBe(true);
    });

    it('should mark theme as NOT ATS-friendly when score < 80', async () => {
      themeAdapter.seed({
        id: 'unfriendly-theme',
        name: 'Unfriendly Theme',
        styleConfig: createSuboptimalATSThemeConfig(),
      });

      const result = await useCase.execute('unfriendly-theme');

      expect(result.overallScore).toBeLessThan(80);
      expect(result.isATSFriendly).toBe(false);
    });
  });

  // ============================================================================
  // Recommendations Tests
  // ============================================================================

  describe('Recommendations', () => {
    it('should include recommendations array', async () => {
      themeAdapter.seed({
        id: 'theme-1',
        name: 'Theme',
        styleConfig: createOptimalATSThemeConfig(),
      });

      const result = await useCase.execute('theme-1');

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should include recommendations for low scores', async () => {
      themeAdapter.seed({
        id: 'low-score-theme',
        name: 'Low Score Theme',
        styleConfig: createSuboptimalATSThemeConfig(),
      });

      const result = await useCase.execute('low-score-theme');

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should have few or no recommendations for optimal theme', async () => {
      themeAdapter.seed({
        id: 'optimal-theme',
        name: 'Optimal Theme',
        styleConfig: createOptimalATSThemeConfig(),
      });

      const result = await useCase.execute('optimal-theme');

      expect(result.recommendations.length).toBeLessThanOrEqual(2);
    });

    it('should recommend single-column for two-column themes', async () => {
      themeAdapter.seed({
        id: 'two-col-theme',
        name: 'Two Column Theme',
        styleConfig: createSuboptimalATSThemeConfig(),
      });

      const result = await useCase.execute('two-col-theme');

      expect(result.recommendations.some((r) => r.toLowerCase().includes('single-column'))).toBe(
        true,
      );
    });
  });

  // ============================================================================
  // Score Consistency Tests
  // ============================================================================

  describe('Score Consistency', () => {
    it('should return same score for same theme on multiple calls', async () => {
      themeAdapter.seed({
        id: 'consistent-theme',
        name: 'Consistent Theme',
        styleConfig: createOptimalATSThemeConfig(),
      });

      const result1 = await useCase.execute('consistent-theme');
      const result2 = await useCase.execute('consistent-theme');

      expect(result1.overallScore).toBe(result2.overallScore);
      expect(result1.breakdown.layout.score).toBe(result2.breakdown.layout.score);
    });

    it('should differentiate between different themes', async () => {
      themeAdapter.seedMany([
        {
          id: 'theme-a',
          name: 'Theme A',
          styleConfig: createOptimalATSThemeConfig(),
        },
        {
          id: 'theme-b',
          name: 'Theme B',
          styleConfig: createSuboptimalATSThemeConfig(),
        },
      ]);

      const resultA = await useCase.execute('theme-a');
      const resultB = await useCase.execute('theme-b');

      expect(resultA.overallScore).not.toBe(resultB.overallScore);
      expect(resultA.overallScore).toBeGreaterThan(resultB.overallScore);
    });
  });
});
