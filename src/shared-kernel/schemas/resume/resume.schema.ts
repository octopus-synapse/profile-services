import { z } from 'zod';
import { ResumeTemplateSchema } from '../../enums';

const ResumeSectionTypeRefSchema = z.object({
  key: z.string().min(1),
  version: z.number().int().min(1).optional(),
});

const ResumeSectionItemPayloadSchema = z.object({
  id: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  content: z.unknown(),
});

const UpsertResumeSectionSchema = z.object({
  sectionType: ResumeSectionTypeRefSchema,
  order: z.number().int().min(0).optional(),
  items: z.array(ResumeSectionItemPayloadSchema).default([]),
});

/**
 * Create Resume Schema
 */
export const CreateResumeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  summary: z.string().max(2000).optional(),
  template: ResumeTemplateSchema.default('PROFESSIONAL'),
  isPublic: z.boolean().default(false),

  // Personal info
  fullName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  emailContact: z.string().email().optional(),
  location: z.string().max(100).optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  website: z.string().url().optional(),

  sections: z.array(UpsertResumeSectionSchema).optional(),
});

export type CreateResume = z.infer<typeof CreateResumeSchema>;

/**
 * Update Resume Schema
 */
export const UpdateResumeSchema = CreateResumeSchema.partial();

export type UpdateResume = z.infer<typeof UpdateResumeSchema>;

/**
 * Resume Relation Keys
 */
export const RESUME_RELATION_KEYS = ['sections'] as const;

export type ResumeRelationKey = (typeof RESUME_RELATION_KEYS)[number];

export type CreateResumeData = Omit<CreateResume, ResumeRelationKey>;
export type UpdateResumeData = Omit<UpdateResume, ResumeRelationKey>;
