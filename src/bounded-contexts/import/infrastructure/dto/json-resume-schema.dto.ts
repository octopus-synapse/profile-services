import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const JsonResumeBasicsLocationSchema = z.object({
  city: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
});

const JsonResumeProfileSchema = z.object({
  network: z.string().optional(),
  url: z.string().url().optional(),
  username: z.string().optional(),
});

const JsonResumeBasicsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  label: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  url: z.string().url().optional(),
  summary: z.string().optional(),
  location: JsonResumeBasicsLocationSchema.optional(),
  profiles: z.array(JsonResumeProfileSchema).optional(),
});

const JsonResumeWorkSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  url: z.string().url().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

const JsonResumeEducationSchema = z.object({
  institution: z.string().optional(),
  area: z.string().optional(),
  studyType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional(),
});

const JsonResumeSkillSchema = z.object({
  name: z.string().optional(),
  level: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

const JsonResumeLanguageSchema = z.object({
  language: z.string().optional(),
  fluency: z.string().optional(),
});

const JsonResumeCertificateSchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  issuer: z.string().optional(),
  url: z.string().url().optional(),
});

const JsonResumeProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
});

export const JsonResumeSchema = z.object({
  basics: JsonResumeBasicsSchema,
  work: z.array(JsonResumeWorkSchema).optional(),
  education: z.array(JsonResumeEducationSchema).optional(),
  skills: z.array(JsonResumeSkillSchema).optional(),
  languages: z.array(JsonResumeLanguageSchema).optional(),
  certificates: z.array(JsonResumeCertificateSchema).optional(),
  projects: z.array(JsonResumeProjectSchema).optional(),
});

export class JsonResumeSchemaDto extends createZodDto(JsonResumeSchema) {}
