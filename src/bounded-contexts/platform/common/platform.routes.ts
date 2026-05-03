/**
 * Route descriptors for the platform/common BC. Replaces
 * `AdminAlertsController`, `AdminDashboardController`, `EnumsController`,
 * and `PlatformStatsController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { PlatformUseCases } from './application/ports/platform.port';

// ─── Response schemas ──────────────────────────────────────────────────
const AdminAlertsResponseSchema = z.object({
  reportsPending: z.number().int(),
  usersPendingVerification: z.number().int(),
  shadowProfilesStale: z.number().int(),
  total: z.number().int(),
});

const AdminDashboardMetricsResponseSchema = z.object({
  totalUsers: z.number().int(),
  totalResumes: z.number().int(),
  activeUsers7d: z.number().int(),
  activeUsers30d: z.number().int(),
  totalViews: z.number().int(),
  signupsThisWeek: z.number().int(),
  signupsThisMonth: z.number().int(),
  resumesThisWeek: z.number().int(),
  resumesThisMonth: z.number().int(),
  averageAtsScore: z.number(),
  onboardingCompletionRate: z.number(),
});

const ExportFormatDescriptorSchema = z.object({
  key: z.enum(['pdf', 'docx', 'json', 'latex']),
  label: z.string(),
  mimeType: z.string(),
  extension: z.string(),
  enabled: z.boolean(),
  requiresPro: z.boolean().optional(),
});

const ExportFormatsResponseSchema = z.object({
  formats: z.array(ExportFormatDescriptorSchema),
});

const UserRolesResponseSchema = z.object({
  roles: z.array(z.object({ role: z.enum(['USER', 'ADMIN']) })),
});

const SectionTypeViewSchema = z.object({
  key: z.string(),
  semanticKind: z.string(),
  title: z.string(),
});

const SectionTypesResponseSchema = z.object({
  types: z.array(SectionTypeViewSchema),
});

const PlatformStatsResponseSchema = z.object({
  totalUsers: z.number().int(),
  totalResumes: z.number().int(),
  totalViews: z.number().int(),
  activeUsersToday: z.number().int(),
  activeUsersWeek: z.number().int(),
  updatedAt: z.string().datetime(),
});

export const platformRoutes: ReadonlyArray<Route<PlatformUseCases>> = [
  // ─── Admin Alerts ─────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/alerts',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_STATS_READ,
    response: AdminAlertsResponseSchema,
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
    response: AdminDashboardMetricsResponseSchema,
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
    response: ExportFormatsResponseSchema,
    openapi: {
      summary: 'Get available export formats',
      tags: ['enums'],
      description: 'Returns all available export formats for resume export',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const formats = await bc.listExportFormats.execute();
      return { formats };
    },
  },
  {
    method: 'GET',
    path: '/v1/enums/user-roles',
    auth: { kind: 'public' },
    response: UserRolesResponseSchema,
    openapi: {
      summary: 'Get available user roles',
      tags: ['enums'],
      description: 'Returns all available user roles in the system',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const roles = (await bc.listUserRoles.execute()).map((role) => ({ role }));
      return { roles };
    },
  },
  {
    method: 'GET',
    path: '/v1/enums/section-types',
    auth: { kind: 'public' },
    response: SectionTypesResponseSchema,
    openapi: {
      summary: 'Get available section types',
      tags: ['enums'],
      description: 'Returns all available resume section types from definitions',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const types = await bc.listSectionTypes.execute();
      return { types };
    },
  },

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
        totalViews: 0,
        activeUsersToday: stats.users.recentSignups,
        activeUsersWeek: stats.users.recentSignups,
        updatedAt: new Date().toISOString(),
      };
    },
  },
];
