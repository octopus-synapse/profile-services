/**
 * In-memory `MeDashboardRepositoryPort` for use-case specs. Lets each
 * test seed exactly the payload + grants it cares about; the
 * `loadDashboard` fallback (returning a zeroed snapshot for unknown
 * users) mirrors the production adapter, which always responds with
 * a viewer stub when Prisma can't find the row.
 */

import type { MeDashboardPayload } from '../domain/entities/me-dashboard';
import type { PermissionGrant } from '../domain/entities/permission-grant';
import { MeDashboardRepositoryPort } from '../domain/ports/me-dashboard.repository.port';

const EMPTY_PAYLOAD = (userId: string): MeDashboardPayload => ({
  viewer: { id: userId, name: null, email: null },
  counts: {
    resumes: 0,
    applications: 0,
    unreadNotifications: 0,
    followers: 0,
    following: 0,
  },
  recentNotifications: [],
  pendingFollowUps: 0,
});

export class InMemoryMeDashboardRepository extends MeDashboardRepositoryPort {
  private readonly dashboards = new Map<string, MeDashboardPayload>();
  private readonly grants = new Map<string, PermissionGrant[]>();

  setDashboard(userId: string, payload: MeDashboardPayload): void {
    this.dashboards.set(userId, payload);
  }

  setGrants(userId: string, grants: PermissionGrant[]): void {
    this.grants.set(userId, [...grants]);
  }

  async loadDashboard(userId: string): Promise<MeDashboardPayload> {
    return this.dashboards.get(userId) ?? EMPTY_PAYLOAD(userId);
  }

  async listActivePermissionGrants(userId: string): Promise<PermissionGrant[]> {
    return [...(this.grants.get(userId) ?? [])];
  }
}
