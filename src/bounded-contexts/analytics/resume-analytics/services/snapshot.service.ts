import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { AnalyticsSnapshot, ScoreProgressionPoint } from '../interfaces';

interface AnalyticsSnapshotInput {
  resumeId: string;
  atsScore: number;
  keywordScore: number;
  completenessScore: number;
  topKeywords?: string[];
  missingKeywords?: string[];
}

@Injectable()
export class SnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: AnalyticsSnapshotInput): Promise<AnalyticsSnapshot> {
    const snapshot = await this.prisma.resumeAnalytics.create({
      data: {
        resumeId: input.resumeId,
        atsScore: input.atsScore,
        keywordScore: input.keywordScore,
        completenessScore: input.completenessScore,
        topKeywords: input.topKeywords ?? [],
        missingKeywords: input.missingKeywords ?? [],
        improvementSuggestions: [],
      },
    });

    return this.mapToSnapshot(snapshot);
  }

  async getHistory(
    resumeId: string,
    limit: number = 10,
  ): Promise<AnalyticsSnapshot[]> {
    const snapshots = await this.prisma.resumeAnalytics.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return snapshots.map((s) => this.mapToSnapshot(s));
  }

  async getScoreProgression(
    resumeId: string,
    days: number = 30,
  ): Promise<ScoreProgressionPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.prisma.resumeAnalytics.findMany({
      where: {
        resumeId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        atsScore: true,
        createdAt: true,
      },
    });

    return snapshots.map((s) => ({
      date: s.createdAt.toISOString().split('T')[0],
      score: s.atsScore,
    }));
  }

  private mapToSnapshot(record: {
    id: string;
    resumeId: string;
    atsScore: number;
    keywordScore: number;
    completenessScore: number;
    industryRank: number | null;
    totalInIndustry: number | null;
    topKeywords: string[];
    missingKeywords: string[];
    createdAt: Date;
  }): AnalyticsSnapshot {
    return {
      id: record.id,
      resumeId: record.resumeId,
      atsScore: record.atsScore,
      keywordScore: record.keywordScore,
      completenessScore: record.completenessScore,
      industryRank: record.industryRank ?? undefined,
      totalInIndustry: record.totalInIndustry ?? undefined,
      topKeywords: record.topKeywords,
      missingKeywords: record.missingKeywords,
      createdAt: record.createdAt,
    };
  }
}
