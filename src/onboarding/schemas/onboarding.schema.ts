/**
 * Onboarding Schema
 * Zod validation schemas for onboarding data
 */

import { z } from 'zod';

const personalInfoSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
});

const professionalProfileSchema = z.object({
  jobTitle: z.string().min(2).max(100),
  summary: z.string().min(10).max(2000),
  linkedin: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

const experienceSchema = z.object({
  company: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  description: z.string().max(2000).optional(),
  location: z.string().optional(),
});

const experiencesStepSchema = z.object({
  experiences: z.array(experienceSchema).optional(),
  noExperience: z.boolean(),
});

const educationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(100),
  field: z.string().min(1).max(100),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
});

const educationStepSchema = z.object({
  education: z.array(educationSchema).optional(),
  noEducation: z.boolean(),
});

const skillSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  level: z.number().min(1).max(5).optional(),
});

const skillsStepSchema = z.object({
  skills: z.array(skillSchema).optional(),
  noSkills: z.boolean(),
});

const languageSchema = z.object({
  name: z.string().min(1).max(50),
  level: z.string(),
});

const templateSelectionSchema = z.object({
  template: z.string(),
  palette: z.string(),
});

export const onboardingDataSchema = z.object({
  username: z.string().min(3).max(30),
  personalInfo: personalInfoSchema,
  professionalProfile: professionalProfileSchema,
  skillsStep: skillsStepSchema,
  experiencesStep: experiencesStepSchema.optional(),
  educationStep: educationStepSchema.optional(),
  languages: z.array(languageSchema).optional(),
  templateSelection: templateSelectionSchema,
});

export type OnboardingData = z.infer<typeof onboardingDataSchema>;
