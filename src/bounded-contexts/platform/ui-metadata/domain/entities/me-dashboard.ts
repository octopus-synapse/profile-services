/**
 * View shapes for the composite "me dashboard" page payload.
 *
 * The shape is dictated by what the dashboard UI renders in a single
 * pass — it is intentionally a denormalized read model rather than a
 * faithful projection of any single aggregate. Keeping it here lets
 * the use case + adapter agree on the contract without leaking
 * persistence concerns.
 */

export interface DashboardViewer {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
}

export interface DashboardCounts {
  readonly resumes: number;
  readonly applications: number;
  readonly unreadNotifications: number;
  readonly followers: number;
  readonly following: number;
}

export interface DashboardNotification {
  readonly id: string;
  readonly type: string;
  readonly message: string;
  readonly messageKey: string | null;
  readonly messageParams: unknown;
  readonly read: boolean;
  readonly createdAt: Date;
}

export interface MeDashboardPayload {
  readonly viewer: DashboardViewer;
  readonly counts: DashboardCounts;
  readonly recentNotifications: readonly DashboardNotification[];
  readonly pendingFollowUps: number;
}
