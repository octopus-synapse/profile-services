/**
 * Route descriptors for the platform/common BC. Replaces
 * `AdminAlertsController`, `AdminDashboardController`, `EnumsController`,
 * and `PlatformStatsController`.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { PlatformUseCases } from './application/ports/platform.port';
import { PlatformStatsResponseSchema } from './platform.routes.schemas';

export const platformRoutes: ReadonlyArray<Route<PlatformUseCases>> = [
  // ─── Admin Alerts ─────────────────────────────────────────────────

  // ─── Admin Dashboard ──────────────────────────────────────────────

  // ─── Enums ────────────────────────────────────────────────────────

  // ─── Platform Stats ───────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/platform/stats',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_STATS_READ,
    response: PlatformStatsResponseSchema,
    openapi: {
      summary: 'Get platform statistics',
      tags: ['platform'],
      description: 'Platform API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const stats = await bc.getPlatformStats.execute();
      return {
        totalUsers: stats.users.total,
        totalResumes: stats.resumes.total,
        activeUsersToday: stats.users.recentSignups,
        activeUsersWeek: stats.users.recentSignups,
        updatedAt: new Date().toISOString(),
      };
    },
  },
];
