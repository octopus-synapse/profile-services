import { z } from 'zod';

export const ResumeSectionTypeRefSchema = z.object({
  key: z.string().min(1),
  version: z.number().int().min(1).optional(),
});

export type ResumeSectionTypeRef = z.infer<typeof ResumeSectionTypeRefSchema>;

export const ResumeSectionItemPayloadSchema = z.object({
  id: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  content: z.unknown(),
});

export type ResumeSectionItemPayload = z.infer<typeof ResumeSectionItemPayloadSchema>;

export const UpsertResumeSectionSchema = z.object({
  sectionType: ResumeSectionTypeRefSchema,
  order: z.number().int().min(0).optional(),
  items: z.array(ResumeSectionItemPayloadSchema).default([]),
});

export type UpsertResumeSection = z.infer<typeof UpsertResumeSectionSchema>;

export const PatchResumeSectionSchema = UpsertResumeSectionSchema.partial().extend({
  sectionType: ResumeSectionTypeRefSchema.optional(),
});

export type PatchResumeSection = z.infer<typeof PatchResumeSectionSchema>;

export const UpsertResumeSectionsSchema = z.object({
  sections: z.array(UpsertResumeSectionSchema),
});

export type UpsertResumeSections = z.infer<typeof UpsertResumeSectionsSchema>;
