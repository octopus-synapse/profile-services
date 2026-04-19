/**
 * In-Memory Snapshot Repository
 *
 * Port-level fake for SnapshotRepositoryPort.
 */

import { SnapshotRepositoryPort } from '../resume-analytics/application/ports/resume-analytics.port';
import type { AnalyticsSnapshot } from '../resume-analytics/interfaces';

export type SnapshotRecord = AnalyticsSnapshot;

export class InMemorySnapshotRepository extends SnapshotRepositoryPort {
  private snapshots: Map<string, AnalyticsSnapshot> = new Map();
  private idCounter = 0;

  async save(input: {
    resumeId: string;
    atsScore: number;
    keywordScore: number;
    completenessScore: number;
    topKeywords?: string[];
    missingKeywords?: string[];
  }): Promise<AnalyticsSnapshot> {
    const id = `snapshot-${++this.idCounter}`;
    const snapshot: AnalyticsSnapshot = {
      id,
      resumeId: input.resumeId,
      atsScore: input.atsScore,
      keywordScore: input.keywordScore,
      completenessScore: input.completenessScore,
      industryRank: undefined,
      totalInIndustry: undefined,
      topKeywords: input.topKeywords ?? [],
      missingKeywords: input.missingKeywords ?? [],
      createdAt: new Date(),
    };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  async getHistory(resumeId: string, limit: number = 10): Promise<AnalyticsSnapshot[]> {
    const results = Array.from(this.snapshots.values())
      .filter((s) => s.resumeId === resumeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return results;
  }

  async getScoreProgression(
    resumeId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; score: number }>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return Array.from(this.snapshots.values())
      .filter((s) => s.resumeId === resumeId && s.createdAt >= cutoff)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((s) => ({
        date: s.createdAt.toISOString().split('T')[0],
        score: s.atsScore,
      }));
  }

  seedSnapshot(snapshot: Partial<AnalyticsSnapshot>): void {
    const id = snapshot.id ?? `snapshot-${++this.idCounter}`;
    this.snapshots.set(id, {
      id,
      resumeId: snapshot.resumeId ?? 'resume-1',
      atsScore: snapshot.atsScore ?? 0,
      keywordScore: snapshot.keywordScore ?? 0,
      completenessScore: snapshot.completenessScore ?? 0,
      industryRank: snapshot.industryRank,
      totalInIndustry: snapshot.totalInIndustry,
      topKeywords: snapshot.topKeywords ?? [],
      missingKeywords: snapshot.missingKeywords ?? [],
      createdAt: snapshot.createdAt ?? new Date(),
    });
  }

  seedSnapshots(snapshots: Partial<AnalyticsSnapshot>[]): void {
    for (const snapshot of snapshots) {
      this.seedSnapshot(snapshot);
    }
  }

  getAll(): AnalyticsSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  clear(): void {
    this.snapshots.clear();
    this.idCounter = 0;
  }
}
