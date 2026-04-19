/**
 * In-Memory Benchmark Repository
 *
 * Port-level fake for BenchmarkRepositoryPort.
 */

import { BenchmarkRepositoryPort } from '../resume-analytics/application/ports/resume-analytics.port';

export interface ResumeAnalyticsRecord {
  id?: string;
  resumeId?: string;
  atsScore: number;
  keywordScore?: number;
  completenessScore?: number;
  createdAt?: Date;
}

export class InMemoryBenchmarkRepository extends BenchmarkRepositoryPort {
  private analytics: Map<string, ResumeAnalyticsRecord> = new Map();
  private idCounter = 0;

  async getAllAtsScores(): Promise<number[]> {
    return Array.from(this.analytics.values()).map((r) => r.atsScore);
  }

  seedAnalytics(record: ResumeAnalyticsRecord): void {
    const id = record.id ?? `analytics-${++this.idCounter}`;
    this.analytics.set(id, {
      id,
      resumeId: record.resumeId ?? `resume-${this.idCounter}`,
      atsScore: record.atsScore,
      keywordScore: record.keywordScore ?? 0,
      completenessScore: record.completenessScore ?? 0,
      createdAt: record.createdAt ?? new Date(),
    });
  }

  seedMultipleAnalytics(records: ResumeAnalyticsRecord[]): void {
    for (const record of records) {
      this.seedAnalytics(record);
    }
  }

  getAll(): ResumeAnalyticsRecord[] {
    return Array.from(this.analytics.values());
  }

  clear(): void {
    this.analytics.clear();
    this.idCounter = 0;
  }
}
