/**
 * Dashboard Service Ports
 *
 * Interfaces for dashboard dependencies following clean architecture.
 * These ports decouple the DashboardService from infrastructure details.
 */

import type { ScoreProgressionPoint, ViewStats, ViewStatsOptions } from '../interfaces';

/**
 * Symbol for dependency injection
 */
/**
 * Port for view tracking operations
 */
export abstract class ViewTrackingPort {
  abstract getViewStats(resumeId: string, options: ViewStatsOptions): Promise<ViewStats>;
}

/**
 * Port for analytics snapshot operations
 */
export abstract class SnapshotPort {
  abstract getScoreProgression(resumeId: string, days: number): Promise<ScoreProgressionPoint[]>;
  /** Latest persisted Resume Quality score for the resume (null if none). */
  abstract getLatest(
    resumeId: string,
  ): Promise<{ overallScore: number; completenessScore: number } | null>;
}
