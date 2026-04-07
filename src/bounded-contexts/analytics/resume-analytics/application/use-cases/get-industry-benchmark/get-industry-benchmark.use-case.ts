/**
 * Get Industry Benchmark Use Case
 *
 * Compares a resume's ATS score against industry-wide data.
 */

import type {
  BenchmarkRecommendation,
  IndustryBenchmark,
  IndustryBenchmarkOptions,
  IndustryComparison,
  TopPerformersProfile,
} from '../../../interfaces';
import type {
  BenchmarkRepositoryPort,
  ResumeOwnershipPort,
} from '../../ports/resume-analytics.port';
import type { CalculateAtsScoreUseCase } from '../calculate-ats-score/calculate-ats-score.use-case';

export class GetIndustryBenchmarkUseCase {
  constructor(
    private readonly benchmarkRepo: BenchmarkRepositoryPort,
    private readonly ownership: ResumeOwnershipPort,
    private readonly atsScore: CalculateAtsScoreUseCase,
  ) {}

  async execute(
    resumeId: string,
    userId: string,
    options: IndustryBenchmarkOptions,
  ): Promise<IndustryBenchmark> {
    await this.ownership.verifyOwnership(resumeId, userId);
    const resume = await this.ownership.getResumeWithDetails(resumeId);
    const atsResult = await this.atsScore.calculate(resume);
    return this.getIndustryBenchmark(atsResult.score, options);
  }

  async getIndustryBenchmark(
    yourScore: number,
    _options: IndustryBenchmarkOptions,
  ): Promise<IndustryBenchmark> {
    const scores = await this.benchmarkRepo.getAllAtsScores();
    const avgScore = this.calculateAverage(scores);
    const yourPercentile = this.calculatePercentile(yourScore, scores);

    const comparison: IndustryComparison = {
      avgATSScore: Math.round(avgScore),
      yourATSScore: yourScore,
      avgViews: 0,
      yourViews: 0,
      avgStructuredItemCount: 0,
      yourStructuredItemCount: 0,
      avgCareerDepthYears: 0,
      yourCareerDepthYears: 0,
    };

    const topPerformers: TopPerformersProfile = {
      commonKeywords: [],
      avgCareerDepthYears: 5,
      avgStructuredItemCount: 10,
      commonCredentials: [],
    };

    return {
      percentile: yourPercentile,
      totalInIndustry: scores.length,
      comparison,
      topPerformers,
      recommendations: this.generateRecommendations(yourScore, avgScore),
    };
  }

  /**
   * Get industry benchmarks for GraphQL aggregation queries
   */
  getIndustryBenchmarks(industry?: string): Array<{
    industry: string;
    averageScore: number;
    sampleSize: number;
    percentile25: number;
    percentile50: number;
    percentile75: number;
  }> {
    const mockBenchmarks = [
      {
        industry: 'Technology',
        averageScore: 82.5,
        sampleSize: 1250,
        percentile25: 70,
        percentile50: 82,
        percentile75: 92,
      },
      {
        industry: 'Healthcare',
        averageScore: 78.3,
        sampleSize: 890,
        percentile25: 65,
        percentile50: 78,
        percentile75: 88,
      },
      {
        industry: 'Finance',
        averageScore: 85.1,
        sampleSize: 1100,
        percentile25: 75,
        percentile50: 85,
        percentile75: 94,
      },
      {
        industry: 'Education',
        averageScore: 76.2,
        sampleSize: 650,
        percentile25: 62,
        percentile50: 76,
        percentile75: 86,
      },
    ];

    if (industry) {
      return mockBenchmarks.filter((b) => b.industry === industry);
    }

    return mockBenchmarks;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculatePercentile(value: number, allValues: number[]): number {
    if (allValues.length === 0) return 50;
    const belowCount = allValues.filter((v) => v < value).length;
    return Math.round((belowCount / allValues.length) * 100);
  }

  private generateRecommendations(yourScore: number, avgScore: number): BenchmarkRecommendation[] {
    const recommendations: BenchmarkRecommendation[] = [];

    if (yourScore < avgScore) {
      recommendations.push({
        type: 'keyword',
        priority: 'high',
        message: 'Your ATS score is below industry average',
        action: 'Optimize keywords and improve resume structure',
      });
    }

    recommendations.push({
      type: 'content',
      priority: 'medium',
      message: 'Add more high-signal structured content for your industry',
      action: 'Review top job postings and enrich the strongest sections',
    });

    return recommendations;
  }
}
