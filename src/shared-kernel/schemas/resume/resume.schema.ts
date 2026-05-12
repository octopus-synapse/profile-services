import { z } from 'zod';
import {
  BioSchema,
  GitHubUrlSchema,
  LinkedInUrlSchema,
  PhoneSchema,
  SocialUrlSchema,
  UserLocationSchema,
} from '../primitives';

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

export const ResumeTemplateEnum = z.enum([
  'PROFESSIONAL',
  'CREATIVE',
  'TECHNICAL',
  'MINIMAL',
  'MODERN',
  'EXECUTIVE',
  'ACADEMIC',
]);

export type ResumeTemplate = z.infer<typeof ResumeTemplateEnum>;

/**
 * Create Resume Schema
 */
export const CreateResumeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  summary: BioSchema.optional(),
  isPublic: z.boolean().default(false), // Personal info
  fullName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: PhoneSchema,
  location: UserLocationSchema,
  linkedin: LinkedInUrlSchema.optional(),
  github: GitHubUrlSchema.optional(),
  website: SocialUrlSchema.optional(),
  template: ResumeTemplateEnum.optional(),
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

export type CreateResumeDto = z.infer<typeof CreateResumeSchema>;

export type UpdateResumeDto = z.infer<typeof UpdateResumeSchema>;

export type ResumeSectionTypeRefDto = z.infer<typeof ResumeSectionTypeRefSchema>;

export type ResumeSectionItemPayloadDto = z.infer<typeof ResumeSectionItemPayloadSchema>;

export type UpsertResumeSectionDto = z.infer<typeof UpsertResumeSectionSchema>;
