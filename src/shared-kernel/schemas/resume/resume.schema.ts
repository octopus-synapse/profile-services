import { z } from 'zod';
import { ResumeTemplateSchema } from '../../enums';
import { CreateExperienceSchema } from './sections/experience.schema';
import { CreateEducationSchema } from './sections/education.schema';
import { CreateSkillSchema } from './sections/skill.schema';
import { CreateLanguageSchema } from './sections/language.schema';
import { CreateCertificationSchema } from './sections/certification.schema';
import { CreateProjectSchema } from './sections/project.schema';

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

  // Relations
  experiences: z.array(CreateExperienceSchema).optional(),
  educations: z.array(CreateEducationSchema).optional(),
  skills: z.array(CreateSkillSchema).optional(),
  languages: z.array(CreateLanguageSchema).optional(),
  certifications: z.array(CreateCertificationSchema).optional(),
  projects: z.array(CreateProjectSchema).optional(),
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
export const RESUME_RELATION_KEYS = [
  'experiences',
  'educations',
  'skills',
  'languages',
  'certifications',
  'projects',
] as const;

export type ResumeRelationKey = (typeof RESUME_RELATION_KEYS)[number];

export type CreateResumeData = Omit<CreateResume, ResumeRelationKey>;
export type UpdateResumeData = Omit<UpdateResume, ResumeRelationKey>;
