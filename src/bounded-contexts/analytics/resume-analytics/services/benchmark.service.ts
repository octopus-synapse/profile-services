import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  IndustryBenchmark,
  IndustryBenchmarkOptions,
  IndustryComparison,
  TopPerformersProfile,
  BenchmarkRecommendation,
} from '../interfaces';

@Injectable()
export class BenchmarkService {
  constructor(private readonly prisma: PrismaService) {}

  async getIndustryBenchmark(
    yourScore: number,
    _options: IndustryBenchmarkOptions,
  ): Promise<IndustryBenchmark> {
    const allSnapshots = await this.prisma.resumeAnalytics.findMany({
      select: { atsScore: true },
    });

    const scores = allSnapshots.map((s) => s.atsScore);
    const avgScore = this.calculateAverage(scores);
    const yourPercentile = this.calculatePercentile(yourScore, scores);

    const comparison: IndustryComparison = {
      avgATSScore: Math.round(avgScore),
      yourATSScore: yourScore,
      avgViews: 0,
      yourViews: 0,
      avgSkillsCount: 0,
      yourSkillsCount: 0,
      avgExperienceYears: 0,
      yourExperienceYears: 0,
    };

    const topPerformers: TopPerformersProfile = {
      commonSkills: [],
      avgExperienceYears: 5,
      avgSkillsCount: 10,
      commonCertifications: [],
    };

    return {
      percentile: yourPercentile,
      totalInIndustry: scores.length,
      comparison,
      topPerformers,
      recommendations: this.generateRecommendations(yourScore, avgScore),
    };
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

  private generateRecommendations(
    yourScore: number,
    avgScore: number,
  ): BenchmarkRecommendation[] {
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
      type: 'skill',
      priority: 'medium',
      message: 'Add trending skills in your industry',
      action: 'Research top skills in job postings',
    });

    return recommendations;
  }

  /**
   * Get industry benchmarks for GraphQL aggregation queries
   *
   * Returns aggregated benchmark data across industries.
   * If industry filter is provided, returns only that industry.
   */
  async getIndustryBenchmarks(industry?: string): Promise<
    Array<{
      industry: string;
      averageScore: number;
      sampleSize: number;
      percentile25: number;
      percentile50: number;
      percentile75: number;
    }>
  > {
    // Mock data - in production, this would aggregate from resume analytics
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
}
