/**
 * In-Memory implementations for Dashboard testing
 *
 * Pure test implementations following clean architecture.
 */

import type { ScoreProgressionPoint, ViewStats, ViewStatsOptions } from '../interfaces';
import type { SnapshotPort, ViewTrackingPort } from '../ports';

/**
 * In-Memory View Tracking for testing
 */
export class InMemoryViewTracking implements ViewTrackingPort {
  private viewStats = new Map<string, ViewStats>();

  async getViewStats(resumeId: string, _options: ViewStatsOptions): Promise<ViewStats> {
    return (
      this.viewStats.get(resumeId) ?? {
        totalViews: 0,
        uniqueVisitors: 0,
        viewsByDay: [],
        topSources: [],
      }
    );
  }

  /**
   * Seeds view stats for a resume (for testing)
   */
  seedViewStats(resumeId: string, stats: Partial<ViewStats>): void {
    this.viewStats.set(resumeId, {
      totalViews: stats.totalViews ?? 0,
      uniqueVisitors: stats.uniqueVisitors ?? 0,
      viewsByDay: stats.viewsByDay ?? [],
      topSources: stats.topSources ?? [],
    });
  }

  clear(): void {
    this.viewStats.clear();
  }
}

/**
 * In-Memory Snapshot Service for testing
 */
export class InMemorySnapshot implements SnapshotPort {
  private progressions = new Map<string, ScoreProgressionPoint[]>();

  async getScoreProgression(resumeId: string, _days: number): Promise<ScoreProgressionPoint[]> {
    return this.progressions.get(resumeId) ?? [];
  }

  /**
   * Seeds score progression for a resume (for testing)
   */
  seedProgression(resumeId: string, points: ScoreProgressionPoint[]): void {
    this.progressions.set(resumeId, points);
  }

  clear(): void {
    this.progressions.clear();
  }
}
