/**
 * View shape returned by the admin dashboard metrics endpoint.
 * Mirrors `AdminDashboardMetricsDataDto` so the use case can build
 * the projection without depending on Nest/Zod.
 */

export interface AdminDashboardMetrics {
  readonly totalUsers: number;
  readonly totalResumes: number;
  readonly activeUsers7d: number;
  readonly activeUsers30d: number;
  readonly totalViews: number;
  readonly signupsThisWeek: number;
  readonly signupsThisMonth: number;
  readonly resumesThisWeek: number;
  readonly resumesThisMonth: number;
  readonly averageAtsScore: number;
  readonly onboardingCompletionRate: number;
}

/**
 * Raw counts pulled from persistence; the use case derives
 * the dashboard projection (rates, etc.) from these.
 */
export interface AdminDashboardCounts {
  readonly totalUsers: number;
  readonly totalResumes: number;
  readonly activeUsers7d: number;
  readonly activeUsers30d: number;
  readonly totalViews: number;
  readonly signupsThisWeek: number;
  readonly signupsThisMonth: number;
  readonly resumesThisWeek: number;
  readonly resumesThisMonth: number;
  readonly onboardingCompleted: number;
}
