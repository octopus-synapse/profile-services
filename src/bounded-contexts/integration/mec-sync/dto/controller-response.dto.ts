/**
 * MEC Sync Controller Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  CourseSchema,
  InstitutionSchema,
  InstitutionWithCoursesSchema,
  MecStatsSchema,
  SyncMetadataSchema,
} from '../schemas/mec.schema';

// ============================================================================
// Schemas
// ============================================================================

const MecCourseListDataSchema = z.object({
  courses: z.array(CourseSchema),
});

const MecCourseDataSchema = z.object({
  course: CourseSchema.nullable(),
});

const MecInstitutionListDataSchema = z.object({
  institutions: z.array(InstitutionSchema),
});

const MecInstitutionDataSchema = z.object({
  institution: InstitutionWithCoursesSchema.nullable(),
});

const MecInstitutionCoursesDataSchema = z.object({
  courses: z.array(CourseSchema),
});

const MecStateCodesDataSchema = z.object({
  states: z.array(z.string()),
});

const MecKnowledgeAreasDataSchema = z.object({
  areas: z.array(z.string()),
});

const MecStatisticsDataSchema = z.object({
  stats: MecStatsSchema,
});

const MecSyncExecutionDataSchema = z.object({
  institutionsInserted: z.number().int(),
  coursesInserted: z.number().int(),
  totalRowsProcessed: z.number().int(),
  errorsCount: z.number().int(),
});

// Flexible schema to accept Prisma MecSyncLog model
const MecSyncLogFlexibleSchema = z.object({}).passthrough();

const MecSyncStatusDataSchema = z.object({
  isRunning: z.boolean(),
  metadata: SyncMetadataSchema.nullable(),
  lastSync: MecSyncLogFlexibleSchema.nullable(),
});

const MecSyncHistoryDataSchema = z.object({
  history: z.array(MecSyncLogFlexibleSchema),
});

// ============================================================================
// DTOs
// ============================================================================

export class MecCourseListDataDto extends createZodDto(MecCourseListDataSchema) {}
export class MecCourseDataDto extends createZodDto(MecCourseDataSchema) {}
export class MecInstitutionListDataDto extends createZodDto(MecInstitutionListDataSchema) {}
export class MecInstitutionDataDto extends createZodDto(MecInstitutionDataSchema) {}
export class MecInstitutionCoursesDataDto extends createZodDto(MecInstitutionCoursesDataSchema) {}
export class MecStateCodesDataDto extends createZodDto(MecStateCodesDataSchema) {}
export class MecKnowledgeAreasDataDto extends createZodDto(MecKnowledgeAreasDataSchema) {}
export class MecStatisticsDataDto extends createZodDto(MecStatisticsDataSchema) {}
export class MecSyncExecutionDataDto extends createZodDto(MecSyncExecutionDataSchema) {}
export class MecSyncStatusDataDto extends createZodDto(MecSyncStatusDataSchema) {}
export class MecSyncHistoryDataDto extends createZodDto(MecSyncHistoryDataSchema) {}
