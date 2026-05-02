import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const PublicShareInfoSchema = z.object({ slug: z.string(), expiresAt: z.date().nullable() });

const PublicResumeSectionSchema = z.object({
  semanticKind: z.string(),
  items: z.array(z.unknown()),
});

const PublicResumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  template: z.string(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
  summary: z.string().nullable(),
  accentColor: z.string().nullable(),
  styleId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  sections: z.array(PublicResumeSectionSchema),
});

const PublicResumeDataSchema = z.object({
  resume: PublicResumeSchema.nullable(),
  share: PublicShareInfoSchema,
});

// ============================================================================
// DTOs
// ============================================================================

export type PublicShareInfoDto = z.infer<typeof PublicShareInfoSchema>;

export type PublicResumeSectionDto = z.infer<typeof PublicResumeSectionSchema>;

export type PublicResumeDto = z.infer<typeof PublicResumeSchema>;

export type PublicResumeDataDto = z.infer<typeof PublicResumeDataSchema>;
