/**
 * Benchmark Service Tests
 *
 * Tests for industry benchmark calculations and comparisons
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { BenchmarkService } from './benchmark.service';

describe('BenchmarkService', () => {
  let service: BenchmarkService;
  let mockPrisma: {
    resumeAnalytics: {
      findMany: ReturnType<typeof mock>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      resumeAnalytics: {
        findMany: mock(() =>
          Promise.resolve([
            { atsScore: 60 },
            { atsScore: 70 },
            { atsScore: 75 },
            { atsScore: 80 },
            { atsScore: 90 },
          ]),
        ),
      },
    };
    service = new BenchmarkService(mockPrisma as never);
  });

  describe('getIndustryBenchmark', () => {
    it('should calculate percentile correctly', async () => {
      const result = await service.getIndustryBenchmark(85, {
        industry: 'technology',
      });

      // Score of 85 is above 80 (4 scores below), so percentile = 80%
      expect(result.percentile).toBe(80);
    });

    it('should return total in industry', async () => {
      const result = await service.getIndustryBenchmark(75, {
        industry: 'technology',
      });

      expect(result.totalInIndustry).toBe(5);
    });

    it('should include comparison data', async () => {
      const result = await service.getIndustryBenchmark(75, {
        industry: 'technology',
      });

      expect(result.comparison).toBeDefined();
      expect(result.comparison.avgATSScore).toBe(75); // (60+70+75+80+90)/5 = 75
      expect(result.comparison.yourATSScore).toBe(75);
    });

    it('should generate recommendations when below average', async () => {
      const result = await service.getIndustryBenchmark(60, {
        industry: 'technology',
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].priority).toBe('high');
    });

    it('should handle empty dataset', async () => {
      mockPrisma.resumeAnalytics.findMany = mock(() => Promise.resolve([]));

      const result = await service.getIndustryBenchmark(75, {
        industry: 'technology',
      });

      expect(result.percentile).toBe(50); // Default when no data
      expect(result.totalInIndustry).toBe(0);
    });

    it('should include top performers profile', async () => {
      const result = await service.getIndustryBenchmark(75, {
        industry: 'technology',
      });

      expect(result.topPerformers).toBeDefined();
      expect(result.topPerformers.avgExperienceYears).toBe(5);
      expect(result.topPerformers.avgSkillsCount).toBe(10);
    });

    it('should calculate correct percentile for highest score', async () => {
      const result = await service.getIndustryBenchmark(95, {
        industry: 'technology',
      });

      expect(result.percentile).toBe(100); // Above all 5 scores
    });

    it('should calculate correct percentile for lowest score', async () => {
      const result = await service.getIndustryBenchmark(50, {
        industry: 'technology',
      });

      expect(result.percentile).toBe(0); // Below all 5 scores
    });
  });

  describe('getIndustryBenchmarks', () => {
    it('should return aggregated benchmarks', () => {
      const result = service.getIndustryBenchmarks();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by industry when provided', () => {
      const result = service.getIndustryBenchmarks('technology');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
