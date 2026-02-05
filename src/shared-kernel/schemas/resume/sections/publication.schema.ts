/**
 * Publication Schema
 *
 * Validation for academic/professional publications.
 * Maps to profile-services Publication model.
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const PublicationTypeSchema = z.enum([
 "JOURNAL_ARTICLE",
 "CONFERENCE_PAPER",
 "BOOK",
 "BOOK_CHAPTER",
 "THESIS",
 "WHITEPAPER",
 "BLOG_POST",
 "TECHNICAL_REPORT",
 "OTHER",
]);

export type PublicationType = z.infer<typeof PublicationTypeSchema>;

// ============================================================================
// Base Schema
// ============================================================================

export const PublicationBaseSchema = z.object({
 title: z.string().min(1, "Title is required").max(500),
 publisher: z.string().min(1, "Publisher is required").max(200),
 publicationType: PublicationTypeSchema,
 url: z.string().url().optional().or(z.literal("")),
 publishedAt: z.coerce.date(),
 abstract: z.string().max(5000).optional(),
 coAuthors: z.array(z.string()).optional().default([]),
 citations: z.number().int().min(0).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreatePublicationSchema = PublicationBaseSchema;
export type CreatePublication = z.infer<typeof CreatePublicationSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdatePublicationSchema = PublicationBaseSchema.partial();
export type UpdatePublication = z.infer<typeof UpdatePublicationSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const PublicationSchema = PublicationBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Publication = z.infer<typeof PublicationSchema>;
