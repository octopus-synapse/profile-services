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

const MecCourseListDataSchema = z.object({ courses: z.array(CourseSchema) });

const MecCourseDataSchema = z.object({ course: CourseSchema.nullable() });

const MecInstitutionListDataSchema = z.object({ institutions: z.array(InstitutionSchema) });

const MecInstitutionDataSchema = z.object({ institution: InstitutionWithCoursesSchema.nullable() });

const MecInstitutionCoursesDataSchema = z.object({ courses: z.array(CourseSchema) });

const MecStateCodesDataSchema = z.object({ states: z.array(z.string()) });

const MecKnowledgeAreasDataSchema = z.object({ areas: z.array(z.string()) });

const MecStatisticsDataSchema = z.object({ stats: MecStatsSchema });

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

const MecSyncHistoryDataSchema = z.object({ history: z.array(MecSyncLogFlexibleSchema) });

// ============================================================================
// DTOs
// ============================================================================

export type MecCourseListDataDto = z.infer<typeof MecCourseListDataSchema>;

export type MecCourseDataDto = z.infer<typeof MecCourseDataSchema>;

export type MecInstitutionListDataDto = z.infer<typeof MecInstitutionListDataSchema>;

export type MecInstitutionDataDto = z.infer<typeof MecInstitutionDataSchema>;

export type MecInstitutionCoursesDataDto = z.infer<typeof MecInstitutionCoursesDataSchema>;

export type MecStateCodesDataDto = z.infer<typeof MecStateCodesDataSchema>;

export type MecKnowledgeAreasDataDto = z.infer<typeof MecKnowledgeAreasDataSchema>;

export type MecStatisticsDataDto = z.infer<typeof MecStatisticsDataSchema>;

export type MecSyncExecutionDataDto = z.infer<typeof MecSyncExecutionDataSchema>;

export type MecSyncLogFlexibleDto = z.infer<typeof MecSyncLogFlexibleSchema>;

export type MecSyncStatusDataDto = z.infer<typeof MecSyncStatusDataSchema>;

export type MecSyncHistoryDataDto = z.infer<typeof MecSyncHistoryDataSchema>;
