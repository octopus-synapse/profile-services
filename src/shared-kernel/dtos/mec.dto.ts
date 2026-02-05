/**
 * MEC Sync DTOs
 * Brazilian Ministry of Education data structures
 */

import { z } from "zod";

// Institution
export const InstitutionSchema = z.object({
 id: z.string(),
 codigoIes: z.number(),
 nome: z.string(),
 sigla: z.string().nullable(),
 uf: z.string(),
 municipio: z.string().nullable(),
 categoria: z.string().nullable(),
 organizacao: z.string().nullable(),
});

export type Institution = z.infer<typeof InstitutionSchema>;

export const CourseBasicSchema = z.object({
 id: z.string(),
 codigoCurso: z.number(),
 nome: z.string(),
 grau: z.string().nullable(),
 modalidade: z.string().nullable(),
 areaConhecimento: z.string().nullable(),
});

export type CourseBasic = z.infer<typeof CourseBasicSchema>;

export const InstitutionWithCoursesSchema = InstitutionSchema.extend({
 courses: z.array(CourseBasicSchema),
});

export type InstitutionWithCourses = z.infer<
 typeof InstitutionWithCoursesSchema
>;

// Course
export const InstitutionBasicSchema = z.object({
 nome: z.string(),
 sigla: z.string().nullable(),
 uf: z.string(),
});

export type InstitutionBasic = z.infer<typeof InstitutionBasicSchema>;

export const CourseSchema = z.object({
 id: z.string(),
 codigoCurso: z.number(),
 nome: z.string(),
 grau: z.string().nullable(),
 modalidade: z.string().nullable(),
 areaConhecimento: z.string().nullable(),
 institution: InstitutionBasicSchema,
});

export type Course = z.infer<typeof CourseSchema>;

// Stats
export const GrauCountSchema = z.object({
 grau: z.string(),
 count: z.number(),
});

export type GrauCount = z.infer<typeof GrauCountSchema>;

export const UfCountSchema = z.object({
 uf: z.string(),
 count: z.number(),
});

export type UfCount = z.infer<typeof UfCountSchema>;

export const MecStatsSchema = z.object({
 totalInstitutions: z.number(),
 totalCourses: z.number(),
 coursesByGrau: z.array(GrauCountSchema),
 institutionsByUf: z.array(UfCountSchema),
});

export type MecStats = z.infer<typeof MecStatsSchema>;

// Sync
export const SyncResultSchema = z.object({
 institutionsInserted: z.number(),
 institutionsUpdated: z.number(),
 coursesInserted: z.number(),
 coursesUpdated: z.number(),
 totalRowsProcessed: z.number(),
 errorsCount: z.number(),
});

export type SyncResult = z.infer<typeof SyncResultSchema>;

export const SyncMetadataSchema = z.object({
 lastSyncAt: z.string(),
 lastSyncStatus: z.enum(["success", "failed", "partial"]),
 lastSyncDuration: z.number(),
 totalInstitutions: z.number(),
 totalCourses: z.number(),
 triggeredBy: z.string(),
});

export type SyncMetadata = z.infer<typeof SyncMetadataSchema>;

export const SyncLogSchema = z.object({
 id: z.string(),
 startedAt: z.string(),
 completedAt: z.string().nullable(),
 status: z.enum(["success", "failed", "partial", "running"]),
 institutionsInserted: z.number(),
 institutionsUpdated: z.number(),
 coursesInserted: z.number(),
 coursesUpdated: z.number(),
 errorsCount: z.number(),
 triggeredBy: z.string(),
});

export type SyncLog = z.infer<typeof SyncLogSchema>;

export const SyncStatusSchema = z.object({
 isRunning: z.boolean(),
 metadata: SyncMetadataSchema.nullable(),
 lastSync: SyncLogSchema.nullable(),
});

export type SyncStatus = z.infer<typeof SyncStatusSchema>;
