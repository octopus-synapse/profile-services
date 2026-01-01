/**
 * Resume Validation Schemas
 * Centralized Zod schemas for resume CRUD operations
 */

import { z } from 'zod';

// Resume Template Enum (matches Prisma enum)
export const resumeTemplateEnum = z.enum([
  'PROFESSIONAL',
  'CREATIVE',
  'TECHNICAL',
  'MINIMAL',
  'MODERN',
  'EXECUTIVE',
  'ACADEMIC',
]);

// Create Resume
export const createResumeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  template: resumeTemplateEnum.default('PROFESSIONAL'),
  language: z.string().default('pt-br'),
});

export type CreateResumeDto = z.infer<typeof createResumeSchema>;

// Update Resume
export const updateResumeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  template: resumeTemplateEnum.optional(),
  language: z.string().optional(),
  isPublic: z.boolean().optional(),
  fullName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  emailContact: z.string().email().optional(),
  location: z.string().max(100).optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  summary: z.string().max(2000).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

export type UpdateResumeDto = z.infer<typeof updateResumeSchema>;

// Experience
export const createExperienceSchema = z.object({
  company: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  startDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  isCurrent: z.boolean(),
  description: z.string().max(2000).optional(),
  location: z.string().max(100).optional(),
  technologies: z.array(z.string()).optional(),
});

export type CreateExperienceDto = z.infer<typeof createExperienceSchema>;

export const updateExperienceSchema = createExperienceSchema.partial();
export type UpdateExperienceDto = z.infer<typeof updateExperienceSchema>;

// Education
export const createEducationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(100),
  field: z.string().min(1).max(100),
  startDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  isCurrent: z.boolean(),
  grade: z.string().max(20).optional(),
  description: z.string().max(1000).optional(),
});

export type CreateEducationDto = z.infer<typeof createEducationSchema>;

export const updateEducationSchema = createEducationSchema.partial();
export type UpdateEducationDto = z.infer<typeof updateEducationSchema>;

// Skill
export const createSkillSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  level: z.number().min(1).max(5).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
});

export type CreateSkillDto = z.infer<typeof createSkillSchema>;

export const updateSkillSchema = createSkillSchema.partial();
export type UpdateSkillDto = z.infer<typeof updateSkillSchema>;

// Bulk create skills
export const bulkCreateSkillsSchema = z.object({
  skills: z.array(createSkillSchema).min(1),
});

export type BulkCreateSkillsDto = z.infer<typeof bulkCreateSkillsSchema>;

// Language
export const createLanguageSchema = z.object({
  name: z.string().min(1).max(50),
  level: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT', 'NATIVE']),
});

export type CreateLanguageDto = z.infer<typeof createLanguageSchema>;

export const updateLanguageSchema = createLanguageSchema.partial();
export type UpdateLanguageDto = z.infer<typeof updateLanguageSchema>;

// Project
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  technologies: z.array(z.string()).optional(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

// Certification
export const createCertificationSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(100),
  issueDate: z.string(),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(100).optional(),
  credentialUrl: z.string().url().optional().or(z.literal('')),
});

export type CreateCertificationDto = z.infer<typeof createCertificationSchema>;

export const updateCertificationSchema = createCertificationSchema.partial();
export type UpdateCertificationDto = z.infer<typeof updateCertificationSchema>;

// Reorder
export const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export type ReorderDto = z.infer<typeof reorderSchema>;
