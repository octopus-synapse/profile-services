import { z } from "zod";
import { SkillLevelSchema, ResumeTemplateSchema } from "../enums";
import {
 LanguageProficiencyEnum,
 CefrLevelEnum,
} from "../validations/onboarding-data.schema";

/**
 * Resume Types
 *
 * Core resume entity types shared between frontend and backend.
 * These represent API contracts, not database schema.
 */

/**
 * Resume Experience Schema
 */
export const ResumeExperienceSchema = z.object({
 id: z.string().uuid(),
 resumeId: z.string().uuid(),
 company: z.string(),
 position: z.string(),
 location: z.string().nullable(),
 startDate: z.string(), // ISO date string
 endDate: z.string().nullable(),
 current: z.boolean(),
 description: z.string().nullable(),
 achievements: z.array(z.string()),
 order: z.number().int().min(0),
});

export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>;

/**
 * Resume Education Schema
 */
export const ResumeEducationSchema = z.object({
 id: z.string().uuid(),
 resumeId: z.string().uuid(),
 institution: z.string(),
 degree: z.string(),
 field: z.string().nullable(),
 location: z.string().nullable(),
 startDate: z.string(),
 endDate: z.string().nullable(),
 current: z.boolean(),
 description: z.string().nullable(),
 gpa: z.string().nullable(),
 order: z.number().int().min(0),
});

export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;

/**
 * Resume Skill Schema
 */
export const ResumeSkillSchema = z.object({
 id: z.string().uuid(),
 resumeId: z.string().uuid(),
 name: z.string(),
 level: SkillLevelSchema,
 category: z.string().nullable(),
 order: z.number().int().min(0),
});

export type ResumeSkill = z.infer<typeof ResumeSkillSchema>;

/**
 * Resume Language Schema
 */
export const ResumeLanguageSchema = z.object({
 id: z.string().uuid(),
 resumeId: z.string().uuid(),
 name: z.string(),
 level: LanguageProficiencyEnum,
 cefrLevel: CefrLevelEnum.nullable(),
 order: z.number().int().min(0),
});

export type ResumeLanguage = z.infer<typeof ResumeLanguageSchema>;

/**
 * Resume Certification Schema
 */
export const ResumeCertificationSchema = z.object({
 id: z.string().uuid(),
 resumeId: z.string().uuid(),
 name: z.string(),
 issuer: z.string(),
 issueDate: z.string().nullable(),
 expiryDate: z.string().nullable(),
 credentialId: z.string().nullable(),
 credentialUrl: z.string().url().nullable(),
 order: z.number().int().min(0),
});

export type ResumeCertification = z.infer<typeof ResumeCertificationSchema>;

/**
 * Resume Project Schema
 */
export const ResumeProjectSchema = z.object({
 id: z.string().uuid(),
 resumeId: z.string().uuid(),
 name: z.string(),
 description: z.string().nullable(),
 url: z.string().url().nullable(),
 repositoryUrl: z.string().url().nullable(),
 startDate: z.string().nullable(),
 endDate: z.string().nullable(),
 highlights: z.array(z.string()),
 technologies: z.array(z.string()),
 order: z.number().int().min(0),
});

export type ResumeProject = z.infer<typeof ResumeProjectSchema>;

/**
 * Complete Resume Schema
 */
export const ResumeSchema = z.object({
 id: z.string().uuid(),
 userId: z.string().uuid(),
 title: z.string(),
 summary: z.string().nullable(),
 template: ResumeTemplateSchema,
 isPublic: z.boolean(),
 slug: z.string().nullable(),
 createdAt: z.string().datetime(),
 updatedAt: z.string().datetime(),

 // Personal info
 fullName: z.string().nullable(),
 jobTitle: z.string().nullable(),
 phone: z.string().nullable(),
 emailContact: z.string().email().nullable(),
 location: z.string().nullable(),
 linkedin: z.string().url().nullable(),
 github: z.string().url().nullable(),
 website: z.string().url().nullable(),

 // Theme
 activeThemeId: z.string().uuid().nullable(),

 // Relations
 experiences: z.array(ResumeExperienceSchema),
 educations: z.array(ResumeEducationSchema),
 skills: z.array(ResumeSkillSchema),
 languages: z.array(ResumeLanguageSchema),
 certifications: z.array(ResumeCertificationSchema),
 projects: z.array(ResumeProjectSchema),
});

export type Resume = z.infer<typeof ResumeSchema>;

/**
 * Resume List Item (without relations)
 */
export const ResumeListItemSchema = ResumeSchema.omit({
 experiences: true,
 educations: true,
 skills: true,
 languages: true,
 certifications: true,
 projects: true,
});

export type ResumeListItem = z.infer<typeof ResumeListItemSchema>;

/**
 * Resume Recommendation Schema (for API responses)
 */
export const ResumeRecommendationSchema = z.object({
 id: z.string().uuid(),
 resumeId: z.string().uuid(),
 author: z.string(),
 position: z.string().nullable(),
 company: z.string().nullable(),
 content: z.string(),
 date: z.string().nullable(),
 order: z.number().int().min(0),
 createdAt: z.string().datetime(),
 updatedAt: z.string().datetime(),
});

export type ResumeRecommendation = z.infer<typeof ResumeRecommendationSchema>;

/**
 * Response DTOs (aliases for API responses)
 * These are aliases for the Resume* types to maintain consistent naming
 */
export type ExperienceResponse = ResumeExperience;
export type EducationResponse = ResumeEducation;
export type SkillResponse = ResumeSkill;
export type LanguageResponse = ResumeLanguage;
export type CertificationResponse = ResumeCertification;
export type ProjectResponse = ResumeProject;
export type RecommendationResponse = ResumeRecommendation;

/**
 * Response Schemas
 * Standard API response wrappers for resume-related endpoints
 */
export const ResumeResponseSchema = z.object({
 data: z.object({
  resume: ResumeSchema,
 }),
});

export type ResumeResponseEnvelope = z.infer<typeof ResumeResponseSchema>;

export const ResumeListResponseSchema = z.object({
 data: z.object({
  resumes: z.array(ResumeListItemSchema),
 }),
 meta: z
  .object({
   total: z.number(),
   page: z.number(),
   limit: z.number(),
   totalPages: z.number(),
  })
  .optional(),
});

export type ResumeListResponseEnvelope = z.infer<
 typeof ResumeListResponseSchema
>;

export const ResumeSlotsResponseSchema = z.object({
 data: z.object({
  remaining: z.number(),
  total: z.number(),
  used: z.number(),
 }),
});

export type ResumeSlotsResponseEnvelope = z.infer<
 typeof ResumeSlotsResponseSchema
>;

export const ExperienceResponseSchema = z.object({
 data: z.object({
  experience: ResumeExperienceSchema,
 }),
});

export type ExperienceResponseEnvelope = z.infer<
 typeof ExperienceResponseSchema
>;

export const ExperienceListResponseSchema = z.object({
 data: z.object({
  experiences: z.array(ResumeExperienceSchema),
 }),
});

export type ExperienceListResponseEnvelope = z.infer<
 typeof ExperienceListResponseSchema
>;

export const EducationResponseSchema = z.object({
 data: z.object({
  education: ResumeEducationSchema,
 }),
});

export type EducationResponseEnvelope = z.infer<typeof EducationResponseSchema>;

export const EducationListResponseSchema = z.object({
 data: z.object({
  educations: z.array(ResumeEducationSchema),
 }),
});

export type EducationListResponseEnvelope = z.infer<
 typeof EducationListResponseSchema
>;

export const SkillResponseSchema = z.object({
 data: z.object({
  skill: ResumeSkillSchema,
 }),
});

export type SkillResponseEnvelope = z.infer<typeof SkillResponseSchema>;

export const SkillListResponseSchema = z.object({
 data: z.object({
  skills: z.array(ResumeSkillSchema),
 }),
});

export type SkillListResponseEnvelope = z.infer<typeof SkillListResponseSchema>;

export const BulkSkillsResponseSchema = z.object({
 data: z.object({
  skills: z.array(ResumeSkillSchema),
 }),
});

export type BulkSkillsResponseEnvelope = z.infer<
 typeof BulkSkillsResponseSchema
>;

export const LanguageResponseSchema = z.object({
 data: z.object({
  language: ResumeLanguageSchema,
 }),
});

export type LanguageResponseEnvelope = z.infer<typeof LanguageResponseSchema>;

export const LanguageListResponseSchema = z.object({
 data: z.object({
  languages: z.array(ResumeLanguageSchema),
 }),
});

export type LanguageListResponseEnvelope = z.infer<
 typeof LanguageListResponseSchema
>;

export const CertificationResponseSchema = z.object({
 data: z.object({
  certification: ResumeCertificationSchema,
 }),
});

export type CertificationResponseEnvelope = z.infer<
 typeof CertificationResponseSchema
>;

export const CertificationListResponseSchema = z.object({
 data: z.object({
  certifications: z.array(ResumeCertificationSchema),
 }),
});

export type CertificationListResponseEnvelope = z.infer<
 typeof CertificationListResponseSchema
>;

export const ProjectResponseSchema = z.object({
 data: z.object({
  project: ResumeProjectSchema,
 }),
});

export type ProjectResponseEnvelope = z.infer<typeof ProjectResponseSchema>;

export const ProjectListResponseSchema = z.object({
 data: z.object({
  projects: z.array(ResumeProjectSchema),
 }),
});

export type ProjectListResponseEnvelope = z.infer<
 typeof ProjectListResponseSchema
>;
