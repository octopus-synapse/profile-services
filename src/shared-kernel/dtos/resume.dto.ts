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

// Experience
export {
  ExperienceBaseSchema,
  CreateExperienceSchema,
  UpdateExperienceSchema,
  ExperienceSchema,
  type CreateExperience,
  type UpdateExperience,
  type Experience,
} from '../schemas/resume/sections/experience.schema';

// Education
export {
  EducationBaseSchema,
  CreateEducationSchema,
  UpdateEducationSchema,
  EducationSchema,
  type CreateEducation,
  type UpdateEducation,
  type Education,
} from '../schemas/resume/sections/education.schema';

// Skill
export {
  SkillBaseSchema,
  CreateSkillSchema,
  UpdateSkillSchema,
  BulkCreateSkillsSchema,
  SkillSchema,
  type CreateSkill,
  type UpdateSkill,
  type BulkCreateSkills,
  type Skill,
} from '../schemas/resume/sections/skill.schema';

// Language
export {
  LanguageBaseSchema,
  CreateLanguageSchema,
  UpdateLanguageSchema,
  LanguageSchema,
  type CreateLanguage,
  type UpdateLanguage,
  type Language,
} from '../schemas/resume/sections/language.schema';

// Certification
export {
  CertificationBaseSchema,
  CreateCertificationSchema,
  UpdateCertificationSchema,
  CertificationSchema,
  type CreateCertification,
  type UpdateCertification,
  type Certification,
} from '../schemas/resume/sections/certification.schema';

// Project
export {
  ProjectBaseSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectSchema,
  type CreateProject,
  type UpdateProject,
  type Project,
} from '../schemas/resume/sections/project.schema';

// Resume (aggregate)
export {
  CreateResumeSchema,
  UpdateResumeSchema,
  RESUME_RELATION_KEYS,
  type CreateResume,
  type UpdateResume,
  type ResumeRelationKey,
  type CreateResumeData,
  type UpdateResumeData,
} from '../schemas/resume/resume.schema';
