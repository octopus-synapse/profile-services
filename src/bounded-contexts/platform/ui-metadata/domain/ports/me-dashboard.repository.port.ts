/**
 * Outbound port for the read-only dashboard projection.
 *
 * Aggregates the half-dozen counts + lookups the dashboard page needs
 * into a single trip. The adapter fan-outs in parallel; the use case
 * stays trivial. Returning a typed snapshot — rather than exposing N
 * granular methods — keeps the chatter between application and
 * persistence layers down to one round-trip per page load.
 */

import type { MeDashboardPayload } from '../entities/me-dashboard';
import type { PermissionGrant } from '../entities/permission-grant';

export abstract class MeDashboardRepositoryPort {
  abstract loadDashboard(userId: string): Promise<MeDashboardPayload>;
  abstract listActivePermissionGrants(userId: string): Promise<PermissionGrant[]>;
}
