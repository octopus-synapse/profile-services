import { Injectable } from '@nestjs/common';
import { SnapshotRepositoryPort } from '../application/ports/resume-analytics.port';
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
  constructor(private readonly repository: SnapshotRepositoryPort) {}

  async save(input: AnalyticsSnapshotInput): Promise<AnalyticsSnapshot> {
    return this.repository.save(input);
  }

  async getHistory(resumeId: string, limit: number = 10): Promise<AnalyticsSnapshot[]> {
    return this.repository.getHistory(resumeId, limit);
  }

  async getScoreProgression(resumeId: string, days: number = 30): Promise<ScoreProgressionPoint[]> {
    return this.repository.getScoreProgression(resumeId, days);
  }
}
