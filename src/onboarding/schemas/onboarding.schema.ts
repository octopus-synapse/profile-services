/**
 * Onboarding Types & Validation using Zod
 * Uncle Bob: "Clean code is simple and direct"
 */

import { z } from 'zod';
import { STRING_LENGTH } from '../../common/constants/validation.constants';

// Step 1: Personal Info (REQUIRED)
export const personalInfoSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(STRING_LENGTH.MAX.NAME, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  location: z.string().optional(),
});

export type PersonalInfo = z.infer<typeof personalInfoSchema>;

// Step 2: Professional Profile (REQUIRED)
export const professionalProfileSchema = z.object({
  jobTitle: z
    .string()
    .min(2, 'Cargo deve ter pelo menos 2 caracteres')
    .max(STRING_LENGTH.MAX.TITLE, 'Cargo muito longo'),
  summary: z
    .string()
    .min(50, 'Resumo deve ter pelo menos 50 caracteres')
    .max(STRING_LENGTH.MAX.DESCRIPTION, 'Resumo muito longo'),
  linkedin: z.string().url('LinkedIn inválido').optional().or(z.literal('')),
  github: z.string().url('GitHub inválido').optional().or(z.literal('')),
  website: z.string().url('Website inválido').optional().or(z.literal('')),
});

export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;

// Step 3: Experience (OPTIONAL - can have "No experience")
export const experienceSchema = z.object({
  company: z.string().min(1, 'Empresa é obrigatória'),
  position: z.string().min(1, 'Cargo é obrigatório'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida (use YYYY-MM-DD)'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida (use YYYY-MM-DD)')
    .optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
  location: z.string().optional(),
});

export type Experience = z.infer<typeof experienceSchema>;

export const experiencesStepSchema = z.object({
  experiences: z.array(experienceSchema).optional(),
  noExperience: z.boolean().default(false),
});

export type ExperiencesStep = z.infer<typeof experiencesStepSchema>;

// Step 4: Education (OPTIONAL - can have "No formal education")
export const educationSchema = z.object({
  institution: z.string().min(1, 'Instituição é obrigatória'),
  degree: z.string().min(1, 'Grau é obrigatório'),
  field: z.string().min(1, 'Área de estudo é obrigatória'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida (use YYYY-MM-DD)'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida (use YYYY-MM-DD)')
    .optional(),
  isCurrent: z.boolean().default(false),
});

export type Education = z.infer<typeof educationSchema>;

export const educationStepSchema = z.object({
  education: z.array(educationSchema).optional(),
  noEducation: z.boolean().default(false),
});

export type EducationStep = z.infer<typeof educationStepSchema>;

// Step 5: Skills (REQUIRED - but can select "No specific skills")
export const skillSchema = z.object({
  name: z.string().min(1, 'Nome da habilidade é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  level: z.number().min(1).max(5).optional(),
});

export type Skill = z.infer<typeof skillSchema>;

export const skillsStepSchema = z
  .object({
    skills: z.array(skillSchema).optional().default([]),
    noSkills: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.noSkills) {
        return true;
      }
      return (
        data.skills &&
        data.skills.length > 0 &&
        data.skills.some((skill) => skill.name.trim().length > 0)
      );
    },
    {
      message:
        "Adicione pelo menos uma habilidade ou marque 'Ainda estou desenvolvendo minhas habilidades'",
      path: ['skills'],
    },
  );

export type SkillsStep = z.infer<typeof skillsStepSchema>;

// Step 6: Languages (OPTIONAL)
export const languageSchema = z.object({
  name: z.string().min(1, 'Nome do idioma é obrigatório'),
  level: z.enum(['básico', 'intermediário', 'avançado', 'fluente', 'nativo']),
});

export type Language = z.infer<typeof languageSchema>;

// Step 7: Projects (OPTIONAL)
export const projectSchema = z.object({
  name: z.string().min(1, 'Nome do projeto é obrigatório'),
  description: z.string().optional(),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida (use YYYY-MM-DD)')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida (use YYYY-MM-DD)')
    .optional(),
  isCurrent: z.boolean().default(false),
  technologies: z.array(z.string()).optional(),
});

export type Project = z.infer<typeof projectSchema>;

// Step 8: Certifications (OPTIONAL)
export const certificationSchema = z.object({
  name: z.string().min(1, 'Nome da certificação é obrigatório'),
  issuer: z.string().min(1, 'Emissor é obrigatório'),
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de emissão inválida (use YYYY-MM-DD)'),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de expiração inválida (use YYYY-MM-DD)')
    .optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

export type Certification = z.infer<typeof certificationSchema>;

// Step 9: Awards (OPTIONAL)
export const awardSchema = z.object({
  title: z.string().min(1, 'Título do prêmio é obrigatório'),
  issuer: z.string().min(1, 'Emissor é obrigatório'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
  description: z.string().optional(),
});

export type Award = z.infer<typeof awardSchema>;

// Step 10: Interests (OPTIONAL)
export const interestSchema = z.object({
  name: z.string().min(1, 'Nome do interesse é obrigatório'),
  description: z.string().optional(),
});

export type Interest = z.infer<typeof interestSchema>;

// Step 11: Template Selection (REQUIRED - Professional only for onboarding)
export const templateSelectionSchema = z.object({
  template: z.literal('professional'),
  palette: z.string().min(1, 'Selecione uma paleta de cores'),
});

export type TemplateSelection = z.infer<typeof templateSelectionSchema>;

// Username schema
export const usernameSchema = z
  .string()
  .min(3, 'Username deve ter pelo menos 3 caracteres')
  .max(30, 'Username deve ter no máximo 30 caracteres')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username pode conter apenas letras, números e underscore');

// Complete Onboarding Data
export const onboardingDataSchema = z.object({
  username: usernameSchema,
  personalInfo: personalInfoSchema,
  professionalProfile: professionalProfileSchema,
  skillsStep: skillsStepSchema,
  experiencesStep: experiencesStepSchema.optional(),
  educationStep: educationStepSchema.optional(),
  languages: z.array(languageSchema).optional(),
  projects: z.array(projectSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
  awards: z.array(awardSchema).optional(),
  interests: z.array(interestSchema).optional(),
  templateSelection: templateSelectionSchema,
});

export type OnboardingData = z.infer<typeof onboardingDataSchema>;
