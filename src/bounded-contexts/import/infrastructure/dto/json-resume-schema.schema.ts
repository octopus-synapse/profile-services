import { z } from 'zod';
import { EmailSchema, SocialUrlSchema } from '@/shared-kernel/schemas/primitives';

const JsonResumeBasicsLocationSchema = z.object({
  city: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
});

const JsonResumeProfileSchema = z.object({
  network: z.string().optional(),
  url: SocialUrlSchema.optional(),
  username: z.string().optional(),
});

const JsonResumeBasicsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  label: z.string().optional(),
  email: EmailSchema.optional(),
  phone: z.string().optional(),
  url: SocialUrlSchema.optional(),
  summary: z.string().optional(),
  location: JsonResumeBasicsLocationSchema.optional(),
  profiles: z.array(JsonResumeProfileSchema).optional(),
});

const JsonResumeWorkSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  url: SocialUrlSchema.optional(),
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
  url: SocialUrlSchema.optional(),
});

const JsonResumeProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  url: SocialUrlSchema.optional(),
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

export type JsonResumeDto = z.infer<typeof JsonResumeSchema>;

export type JsonResumeBasicsLocationDto = z.infer<typeof JsonResumeBasicsLocationSchema>;

export type JsonResumeProfileDto = z.infer<typeof JsonResumeProfileSchema>;

export type JsonResumeBasicsDto = z.infer<typeof JsonResumeBasicsSchema>;

export type JsonResumeWorkDto = z.infer<typeof JsonResumeWorkSchema>;

export type JsonResumeEducationDto = z.infer<typeof JsonResumeEducationSchema>;

export type JsonResumeSkillDto = z.infer<typeof JsonResumeSkillSchema>;

export type JsonResumeLanguageDto = z.infer<typeof JsonResumeLanguageSchema>;

export type JsonResumeCertificateDto = z.infer<typeof JsonResumeCertificateSchema>;

export type JsonResumeProjectDto = z.infer<typeof JsonResumeProjectSchema>;
