/**
 * Route descriptors for the mec-sync BC. Replaces
 * `MecCourseController`, `MecInstitutionController`,
 * `MecMetadataController`, and `MecSyncInternalController`. The
 * internal/admin endpoints are gated by `InternalAuthGuard`, registered
 * via the synthesizer guard registry under id `internal-auth`.
 *
 * BUG-035 (NaN limit handling) is preserved — the helpers below
 * mirror the original parseInt validation semantics.
 */

import { z } from 'zod';
import { ValidationException } from '@/shared-kernel';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import {
  CourseSchema,
  InstitutionSchema,
  InstitutionWithCoursesSchema,
  MecStatsSchema,
  SyncMetadataSchema,
} from './schemas/mec.schema';

// ─── Response schemas ────────────────────────────────────────────────
export const CoursesListResponseSchema = z.object({ courses: z.array(CourseSchema) });
export const CourseResponseSchema = z.object({ course: CourseSchema.nullable() });

export const InstitutionsListResponseSchema = z.object({
  institutions: z.array(InstitutionSchema),
});
export const InstitutionResponseSchema = z.object({
  institution: InstitutionWithCoursesSchema.nullable(),
});

export const StatesResponseSchema = z.object({ states: z.array(z.string()) });
export const AreasResponseSchema = z.object({ areas: z.array(z.string()) });
export const StatsResponseSchema = z.object({ stats: MecStatsSchema });

export const SyncTriggerResponseSchema = z.object({
  institutionsInserted: z.number().int().min(0),
  coursesInserted: z.number().int().min(0),
  totalRowsProcessed: z.number().int().min(0),
  errorsCount: z.number().int().min(0),
});

// `SyncLogRow` is `{ id: string; [k: string]: unknown }` — Prisma's row
// shape varies and we already serialize through `JSON.stringify` (Date →
// ISO string). Use a passthrough record so we stay schema-driven without
// `z.unknown()` at the leaves.
export const SyncLogRowSchema = IdParamSchema.passthrough();

export const SyncStatusResponseSchema = z.object({
  isRunning: z.boolean(),
  metadata: SyncMetadataSchema.nullable(),
  lastSync: SyncLogRowSchema.nullable(),
});

export const SyncHistoryResponseSchema = z.object({
  history: z.array(SyncLogRowSchema),
});

/**
 * Strict limit parser — throws when the caller passes something that
 * isn't a positive number. mec-sync admin endpoints use this so
 * obvious typos (`?limit=foo`) surface as 400 rather than silently
 * applying the fallback.
 */
export function parseLimitOrThrow(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new ValidationException('Invalid limit parameter. Must be a positive number.');
  }
  return parsed;
}

export function parseCodeOrThrow(raw: string): number {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new ValidationException('Invalid integer parameter.');
  }
  return parsed;
}

export const SearchQuery = z.object({
  q: z.string(),
  limit: z.string().optional(),
});

export const ListInstitutionsQuery = z.object({
  uf: z.string().optional(),
});

export const CourseCodeParams = z.object({ codigoCurso: z.string() });
export const InstitutionCodeParams = z.object({ codigoIes: z.string() });
