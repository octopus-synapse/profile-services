/**
 * Talk Schema
 *
 * Validation for conference talks, presentations, and speaking engagements.
 * Maps to profile-services Talk model.
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const EventTypeSchema = z.enum([
 "CONFERENCE",
 "MEETUP",
 "WORKSHOP",
 "WEBINAR",
 "PODCAST",
 "INTERNAL",
 "UNIVERSITY",
 "OTHER",
]);

export type EventType = z.infer<typeof EventTypeSchema>;

// ============================================================================
// Base Schema
// ============================================================================

export const TalkBaseSchema = z.object({
 title: z.string().min(1, "Title is required").max(300),
 event: z.string().min(1, "Event name is required").max(200),
 eventType: EventTypeSchema,
 location: z.string().max(200).optional(),
 date: z.coerce.date(),
 description: z.string().max(3000).optional(),
 slidesUrl: z.string().url().optional().or(z.literal("")),
 videoUrl: z.string().url().optional().or(z.literal("")),
 attendees: z.number().int().min(0).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateTalkSchema = TalkBaseSchema;
export type CreateTalk = z.infer<typeof CreateTalkSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateTalkSchema = TalkBaseSchema.partial();
export type UpdateTalk = z.infer<typeof UpdateTalkSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const TalkSchema = TalkBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Talk = z.infer<typeof TalkSchema>;
