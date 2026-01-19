/**
 * Analytics Snapshot Service
 *
 * Manages historical snapshots and score progression tracking.
 * Enables trend analysis over time.
 *
 * Extracted from ResumeAnalyticsService as part of god class decomposition.
 * @see ADR-000X — Enforce Disciplined, Persona-Aware Engineering
 */

import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../repositories';
import type {
  AnalyticsSnapshot,
  ScoreProgression,
  Industry,
} from '../interfaces';
import { ATSScoreService } from './ats-score.service';
import { KeywordAnalyzerService } from './keyword-analyzer.service';

/**
 * Resume data structure for snapshots
 */
export interface ResumeForSnapshot {
  summary?: string | null;
  jobTitle?: string | null;
  emailContact?: string | null;
  phone?: string | null;
  skills: Array<{ name: string }>;
  experiences: Array<{
    title?: string | null;
    company?: string | null;
    description?: string | null;
  }>;
}

@Injectable()
export class SnapshotService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly atsScoreService: ATSScoreService,
    private readonly keywordAnalyzerService: KeywordAnalyzerService,
  ) {}

  /**
   * Create a new analytics snapshot for a resume
   */
  async saveSnapshot(
    resumeId: string,
    resume: ResumeForSnapshot,
    industry: Industry = 'software_engineering',
  ): Promise<AnalyticsSnapshot> {
    const atsResult = this.atsScoreService.calculateScore(resume);
    const keywordResult = this.keywordAnalyzerService.getSuggestions(resume, {
      industry,
    });

    return this.repository.createAnalyticsSnapshot({
      resumeId,
      atsScore: atsResult.score,
      keywordScore: Math.round(100 - keywordResult.keywordDensity),
      completenessScore: atsResult.breakdown.completeness,
      topKeywords: keywordResult.existingKeywords
        .slice(0, 10)
        .map((k) => k.keyword),
      missingKeywords: keywordResult.missingKeywords.slice(0, 10),
    }) as unknown as Promise<AnalyticsSnapshot>;
  }

  /**
   * Get historical snapshots for a resume
   */
  async getHistory(
    resumeId: string,
    options: { limit?: number } = {},
  ): Promise<AnalyticsSnapshot[]> {
    return this.repository.findAnalyticsSnapshots(resumeId, {
      limit: options.limit ?? 10,
      orderBy: 'desc',
    }) as unknown as Promise<AnalyticsSnapshot[]>;
  }

  /**
   * Get score progression trend for a resume
   */
  async getScoreProgression(resumeId: string): Promise<ScoreProgression> {
    const snapshots =
      await this.repository.findAnalyticsScoreProgression(resumeId);

    if (snapshots.length < 2) {
      return {
        snapshots: snapshots.map((s) => ({
          date: s.createdAt,
          score: s.atsScore,
        })),
        trend: 'stable',
        changePercent: 0,
      };
    }

    const firstScore = snapshots[0].atsScore;
    const lastScore = snapshots[snapshots.length - 1].atsScore;
    const changePercent =
      firstScore > 0
        ? Math.round(((lastScore - firstScore) / firstScore) * 10000) / 100
        : 0;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (changePercent > 5) trend = 'improving';
    if (changePercent < -5) trend = 'declining';

    return {
      snapshots: snapshots.map((s) => ({
        date: s.createdAt,
        score: s.atsScore,
      })),
      trend,
      changePercent,
    };
  }
}
