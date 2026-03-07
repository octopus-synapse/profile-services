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
export const VIEW_TRACKING_PORT = Symbol('VIEW_TRACKING_PORT');
export const SNAPSHOT_PORT = Symbol('SNAPSHOT_PORT');

/**
 * Port for view tracking operations
 */
export interface ViewTrackingPort {
  getViewStats(resumeId: string, options: ViewStatsOptions): Promise<ViewStats>;
}

/**
 * Port for analytics snapshot operations
 */
export interface SnapshotPort {
  getScoreProgression(resumeId: string, days: number): Promise<ScoreProgressionPoint[]>;
}
