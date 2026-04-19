/**
 * Get Industry Benchmark Use Case Tests
 *
 * Tests for industry benchmark calculations and comparisons
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  defaultResumeAnalytics,
  InMemoryBenchmarkRepository,
} from '@/bounded-contexts/analytics/testing';
import type { AtsScoringPort } from '../../ports/facade.ports';
import type { ResumeOwnershipPort } from '../../ports/resume-analytics.port';
import { GetIndustryBenchmarkUseCase } from './get-industry-benchmark.use-case';

describe('GetIndustryBenchmarkUseCase', () => {
  let useCase: GetIndustryBenchmarkUseCase;
  let benchmarkRepo: InMemoryBenchmarkRepository;

  beforeEach(() => {
    benchmarkRepo = new InMemoryBenchmarkRepository();
    benchmarkRepo.seedMultipleAnalytics(defaultResumeAnalytics);

    const ownership: ResumeOwnershipPort = {
      async verifyOwnership() {
        throw new Error('not used in test');
      },
      async verifyResumeExists() {
        throw new Error('not used in test');
      },
      async getResumeWithDetails() {
        throw new Error('not used in test');
      },
    };
    const atsScore: AtsScoringPort = {
      async calculate() {
        throw new Error('not used in test');
      },
    };

    useCase = new GetIndustryBenchmarkUseCase(benchmarkRepo, ownership, atsScore);
  });

  describe('getIndustryBenchmark', () => {
    it('should calculate percentile correctly', async () => {
      const result = await useCase.getIndustryBenchmark(85, {
        industry: 'software_engineering',
      });

      expect(result.percentile).toBe(80);
    });

    it('should return total in industry', async () => {
      const result = await useCase.getIndustryBenchmark(75, {
        industry: 'software_engineering',
      });

      expect(result.totalInIndustry).toBe(5);
    });

    it('should include comparison data', async () => {
      const result = await useCase.getIndustryBenchmark(75, {
        industry: 'software_engineering',
      });

      expect(result.comparison).toBeDefined();
      expect(result.comparison.avgATSScore).toBe(75);
      expect(result.comparison.yourATSScore).toBe(75);
    });

    it('should generate recommendations when below average', async () => {
      const result = await useCase.getIndustryBenchmark(60, {
        industry: 'software_engineering',
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].priority).toBe('high');
    });

    it('should handle empty dataset', async () => {
      benchmarkRepo.clear();

      const result = await useCase.getIndustryBenchmark(75, {
        industry: 'software_engineering',
      });

      expect(result.percentile).toBe(50);
      expect(result.totalInIndustry).toBe(0);
    });

    it('should include top performers profile', async () => {
      const result = await useCase.getIndustryBenchmark(75, {
        industry: 'software_engineering',
      });

      expect(result.topPerformers).toBeDefined();
      expect(result.topPerformers.avgCareerDepthYears).toBe(5);
      expect(result.topPerformers.avgStructuredItemCount).toBe(10);
    });

    it('should calculate correct percentile for highest score', async () => {
      const result = await useCase.getIndustryBenchmark(95, {
        industry: 'software_engineering',
      });

      expect(result.percentile).toBe(100);
    });

    it('should calculate correct percentile for lowest score', async () => {
      const result = await useCase.getIndustryBenchmark(50, {
        industry: 'software_engineering',
      });

      expect(result.percentile).toBe(0);
    });
  });

  describe('getIndustryBenchmarks', () => {
    it('should return aggregated benchmarks', () => {
      const result = useCase.getIndustryBenchmarks();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by industry when provided', () => {
      const result = useCase.getIndustryBenchmarks('technology');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
