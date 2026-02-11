/**
 * Resume DTOs
 *
 * Data Transfer Objects for resume operations.
 *
 * IMPORTANT: This file RE-EXPORTS schemas from the domain layer.
 * Single source of truth is in domain/schemas/resume/
 *
 * Clean Architecture: Application layer depends on Domain layer
 */

// ============================================================================
// RE-EXPORTS FROM DOMAIN LAYER
// ============================================================================
// These DTOs are defined ONCE in the domain layer.
// Application layer re-exports them to maintain the contract API.

// Resume (aggregate)
export {
  type CreateResume,
  type CreateResumeData,
  CreateResumeSchema,
  RESUME_RELATION_KEYS,
  type ResumeRelationKey,
  type UpdateResume,
  type UpdateResumeData,
  UpdateResumeSchema,
} from '../schemas/resume/resume.schema';
// Certification
export {
  type Certification,
  CertificationBaseSchema,
  CertificationSchema,
  type CreateCertification,
  CreateCertificationSchema,
  type UpdateCertification,
  UpdateCertificationSchema,
} from '../schemas/resume/sections/certification.schema';
// Education
export {
  type CreateEducation,
  CreateEducationSchema,
  type Education,
  EducationBaseSchema,
  EducationSchema,
  type UpdateEducation,
  UpdateEducationSchema,
} from '../schemas/resume/sections/education.schema';
// Experience
export {
  type CreateExperience,
  CreateExperienceSchema,
  type Experience,
  ExperienceBaseSchema,
  ExperienceSchema,
  type UpdateExperience,
  UpdateExperienceSchema,
} from '../schemas/resume/sections/experience.schema';
// Language
export {
  type CreateLanguage,
  CreateLanguageSchema,
  type Language,
  LanguageBaseSchema,
  LanguageSchema,
  type UpdateLanguage,
  UpdateLanguageSchema,
} from '../schemas/resume/sections/language.schema';

// Project
export {
  type CreateProject,
  CreateProjectSchema,
  type Project,
  ProjectBaseSchema,
  ProjectSchema,
  type UpdateProject,
  UpdateProjectSchema,
} from '../schemas/resume/sections/project.schema';
// Skill
export {
  type BulkCreateSkills,
  BulkCreateSkillsSchema,
  type CreateSkill,
  CreateSkillSchema,
  type Skill,
  SkillBaseSchema,
  SkillSchema,
  type UpdateSkill,
  UpdateSkillSchema,
} from '../schemas/resume/sections/skill.schema';
