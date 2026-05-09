/**
 * Route descriptors for the platform/common BC. Replaces
 * `AdminAlertsController`, `AdminDashboardController`, `EnumsController`,
 * and `PlatformStatsController`.
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// ─── Response schemas ──────────────────────────────────────────────────
export const AdminAlertsResponseSchema = z.object({
  reportsPending: z.number().int(),
  usersPendingVerification: z.number().int(),
  shadowProfilesStale: z.number().int(),
  total: z.number().int(),
});

export const AdminDashboardMetricsResponseSchema = z.object({
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

export const ExportFormatDescriptorSchema = z.object({
  key: z.enum(['pdf', 'docx', 'json', 'latex']),
  label: z.string(),
  mimeType: z.string(),
  extension: z.string(),
  enabled: z.boolean(),
  requiresPro: z.boolean().optional(),
});

export const ExportFormatsResponseSchema = z.object({
  formats: z.array(ExportFormatDescriptorSchema),
});

export const UserRolesResponseSchema = z.object({
  roles: z.array(z.object({ role: z.enum(['USER', 'ADMIN']) })),
});

export const SectionTypeViewSchema = z.object({
  key: z.string(),
  semanticKind: z.string(),
  title: z.string(),
});

export const SectionTypesResponseSchema = z.object({
  types: z.array(SectionTypeViewSchema),
});

export const PlatformStatsResponseSchema = z.object({
  totalUsers: z.number().int(),
  totalResumes: z.number().int(),
  totalViews: z.number().int(),
  activeUsersToday: z.number().int(),
  activeUsersWeek: z.number().int(),
  updatedAt: IsoDateTimeSchema,
});
