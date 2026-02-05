/**
 * Export DTOs
 *
 * Domain types and validation schemas for resume export functionality
 * (PDF, DOCX, HTML, JSON formats).
 */

import { z } from "zod";

// ============================================================================
// Export Format
// ============================================================================

export const ExportFormatEnum = z.enum(["pdf", "docx", "html", "json"]);
export type ExportFormat = z.infer<typeof ExportFormatEnum>;

// ============================================================================
// Export Options
// ============================================================================

export const ExportBannerOptionsSchema = z.object({
 palette: z.string().optional(),
 logo: z.string().url().optional(),
});

export type ExportBannerOptions = z.infer<typeof ExportBannerOptionsSchema>;

export const ExportResumeOptionsSchema = z.object({
 resumeId: z.string().cuid(),
 themeId: z.string().cuid().optional(),
 format: ExportFormatEnum.default("pdf"),
});

export type ExportResumeOptions = z.infer<typeof ExportResumeOptionsSchema>;

// ============================================================================
// Export Job
// ============================================================================

export const ExportStatusEnum = z.enum([
 "pending",
 "processing",
 "completed",
 "failed",
]);

export type ExportStatus = z.infer<typeof ExportStatusEnum>;

export const ExportJobSchema = z.object({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 format: ExportFormatEnum,
 status: ExportStatusEnum,
 progress: z.number().int().min(0).max(100),
 downloadUrl: z.string().url().nullable(),
 error: z.string().nullable(),
 createdAt: z.string().datetime(),
});

export type ExportJob = z.infer<typeof ExportJobSchema>;
