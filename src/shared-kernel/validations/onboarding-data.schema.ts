/**
 * Onboarding Data Validation Schema
 *
 * Complete payload validation for onboarding submission.
 * Ensures data integrity before API submission.
 *
 * IMPORTANT: These schemas are the single source of truth for
 * profile-backend, profile-frontend, and api-client.
 */

import { z } from 'zod';
import { EmailSchema } from '../schemas/primitives';
import { ProfessionalProfileSchema } from './professional-profile.schema';
import { UsernameSchema } from './username.schema';

// PersonalInfoSchema (exported for onboarding-progress.dto.ts)
export const PersonalInfoSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: EmailSchema,
  phone: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
});

/**
 * Date Format
 * Backend accepts both YYYY-MM-DD (from date inputs) and YYYY-MM (display)
 */
const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Invalid date format (YYYY-MM or YYYY-MM-DD)');

/**
 * Experience Entry Schema
 * Aligned with profile-backend CreateExperienceDto
 */
export const ExperienceSchema = z.object({
  company: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  position: z.string().min(1, 'Position is required').max(100, 'Position too long'),
  startDate: DateString,
  endDate: DateString.optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(2000, 'Description too long').optional(),
  location: z.string().max(100, 'Location too long').optional(),
});

export type Experience = z.infer<typeof ExperienceSchema>;

/**
 * Education Entry Schema
 * Aligned with profile-backend CreateEducationDto
 */
export const EducationSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(200, 'Institution name too long'),
  degree: z.string().min(1, 'Degree is required').max(100, 'Degree too long'),
  field: z.string().min(1, 'Field of study is required').max(100, 'Field too long'),
  startDate: DateString,
  endDate: DateString.optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(1000, 'Description too long').optional(),
});

export type Education = z.infer<typeof EducationSchema>;

/**
 * Skill Entry Schema
 */
export const SkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(50, 'Skill name too long'),
  category: z.string().max(50, 'Category too long').optional(),
});

export type Skill = z.infer<typeof SkillSchema>;

/**
 * Language Entry Schema
 * Aligned with profile-backend CreateLanguageDto
 */
export const LanguageProficiencyEnum = z.enum([
  'BASIC',
  'INTERMEDIATE',
  'ADVANCED',
  'FLUENT',
  'NATIVE',
]);

export type LanguageProficiency = z.infer<typeof LanguageProficiencyEnum>;

export const CefrLevelEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type CefrLevel = z.infer<typeof CefrLevelEnum>;

export const LanguageSchema = z.object({
  name: z.string().min(1, 'Language is required').max(50, 'Language name too long'),
  level: LanguageProficiencyEnum,
  cefrLevel: CefrLevelEnum.optional(),
});

export type Language = z.infer<typeof LanguageSchema>;

/**
 * Template Selection Schema
 */
export const TemplateSelectionSchema = z.object({
  template: z.string().min(1, 'Template is required'),
  palette: z.string().min(1, 'Color palette is required'),
});

export type TemplateSelection = z.infer<typeof TemplateSelectionSchema>;

/**
 * Complete Onboarding Payload Schema
 *
 * Validates entire submission before sending to backend.
 */
export const OnboardingDataSchema = z.object({
  username: UsernameSchema,
  personalInfo: PersonalInfoSchema,
  professionalProfile: ProfessionalProfileSchema,
  skills: z.array(SkillSchema),
  noSkills: z.boolean(),
  experiences: z.array(ExperienceSchema),
  noExperience: z.boolean(),
  education: z.array(EducationSchema),
  noEducation: z.boolean(),
  languages: z.array(LanguageSchema),
  templateSelection: TemplateSelectionSchema,
});

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;
