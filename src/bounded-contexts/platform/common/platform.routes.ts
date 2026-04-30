/**
 * Route descriptors for the platform/common BC. Replaces
 * `AdminAlertsController`, `AdminDashboardController`, `EnumsController`,
 * and `PlatformStatsController`.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { PlatformUseCases } from './application/ports/platform.port';

export const platformRoutes: ReadonlyArray<Route<PlatformUseCases>> = [
  // ─── Admin Alerts ─────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/alerts',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_STATS_READ,
    openapi: {
      summary: 'Counts of admin-actionable queues: reports, verifications, stale shadow profiles',
      tags: ['admin-alerts'],
      description: 'Admin Alerts API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => bc.getAdminAlerts.execute(),
  },

  // ─── Admin Dashboard ──────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/dashboard/metrics',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_STATS_READ,
    openapi: {
      summary: 'Get platform metrics for admin dashboard',
      tags: ['admin-dashboard'],
      description: 'Admin Dashboard API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => bc.getAdminDashboardMetrics.execute(),
  },

  // ─── Enums ────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/enums/export-formats',
    auth: { kind: 'public' },
    openapi: {
      summary: 'Get available export formats',
      tags: ['enums'],
      description: 'Returns all available export formats for resume export',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const formats = (await bc.listExportFormats.execute()).map((format) => ({ format }));
      return { success: true, data: { formats } };
    },
  },
  {
    method: 'GET',
    path: '/v1/enums/user-roles',
    auth: { kind: 'public' },
    openapi: {
      summary: 'Get available user roles',
      tags: ['enums'],
      description: 'Returns all available user roles in the system',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const roles = (await bc.listUserRoles.execute()).map((role) => ({ role }));
      return { success: true, data: { roles } };
    },
  },
  {
    method: 'GET',
    path: '/v1/enums/section-types',
    auth: { kind: 'public' },
    openapi: {
      summary: 'Get available section types',
      tags: ['enums'],
      description: 'Returns all available resume section types from definitions',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const types = await bc.listSectionTypes.execute();
      return { success: true, data: { types } };
    },
  },

  // ─── Platform Stats ───────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/platform/stats',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_STATS_READ,
    openapi: {
      summary: 'Get platform statistics',
      tags: ['platform'],
      description: 'Platform API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const stats = await bc.getPlatformStats.execute();
      return {
        success: true,
        data: {
          totalUsers: stats.users.total,
          totalResumes: stats.resumes.total,
          totalViews: 0,
          activeUsersToday: stats.users.recentSignups,
          activeUsersWeek: stats.users.recentSignups,
          updatedAt: new Date().toISOString(),
        },
      };
    },
  },
];
