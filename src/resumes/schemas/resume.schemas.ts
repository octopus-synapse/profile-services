/**
 * Resume Validation Schemas
 *
 * Re-exports from @octopus-synapse/profile-contracts v2.1.0.
 * Single source of truth for resume validation shared with frontend.
 *
 * MIGRATION NOTE: All duplicated local schemas replaced with profile-contracts.
 * This eliminates ~600 lines of code and ensures frontend/backend consistency.
 */

// Core Resume Schemas
export {
  CreateExperienceSchema as createExperienceSchema,
  type CreateExperience as CreateExperienceDto,
  CreateEducationSchema as createEducationSchema,
  type CreateEducation as CreateEducationDto,
  CreateSkillSchema as createSkillSchema,
  type CreateSkill as CreateSkillDto,
  CreateLanguageSchema as createLanguageSchema,
  type CreateLanguage as CreateLanguageDto,
  CreateCertificationSchema as createCertificationSchema,
  type CreateCertification as CreateCertificationDto,
  CreateProjectSchema as createProjectSchema,
  type CreateProject as CreateProjectDto,
  CreateResumeSchema as createResumeSchema,
  type CreateResume as CreateResumeDto,
  UpdateResumeSchema as updateResumeSchema,
  type UpdateResume as UpdateResumeDto,
} from '@octopus-synapse/profile-contracts';

// Extended Resume Schemas (v2.1.0+)
export {
  PublicationTypeEnum,
  type PublicationType,
  CreatePublicationSchema as createPublicationSchema,
  type CreatePublication as CreatePublicationDto,
  CreateRecommendationSchema as createRecommendationSchema,
  type CreateRecommendation as CreateRecommendationDto,
  CreateHackathonSchema as createHackathonSchema,
  type CreateHackathon as CreateHackathonDto,
  BugBountyPlatformEnum,
  BugBountySeverityEnum,
  type BugBountyPlatform,
  type BugBountySeverity,
  CreateBugBountySchema as createBugBountySchema,
  type CreateBugBounty as CreateBugBountyDto,
  OpenSourceRoleEnum,
  type OpenSourceRole,
  CreateOpenSourceSchema as createOpenSourceSchema,
  type CreateOpenSource as CreateOpenSourceDto,
  TalkTypeEnum,
  type TalkType,
  CreateTalkSchema as createTalkSchema,
  type CreateTalk as CreateTalkDto,
  CreateAwardSchema as createAwardSchema,
  type CreateAward as CreateAwardDto,
  CreateInterestSchema as createInterestSchema,
  type CreateInterest as CreateInterestDto,
} from '@octopus-synapse/profile-contracts';

// Update schemas (partial versions) - use imported types directly
import type {
  CreateExperience,
  CreateEducation,
  CreateSkill,
  CreateLanguage,
  CreateCertification,
  CreateProject,
  CreatePublication,
  CreateRecommendation,
  CreateHackathon,
  CreateBugBounty,
  CreateOpenSource,
  CreateTalk,
  CreateAward,
  CreateInterest,
} from '@octopus-synapse/profile-contracts';

export type UpdateExperienceDto = Partial<CreateExperience>;
export type UpdateEducationDto = Partial<CreateEducation>;
export type UpdateSkillDto = Partial<CreateSkill>;
export type UpdateLanguageDto = Partial<CreateLanguage>;
export type UpdateCertificationDto = Partial<CreateCertification>;
export type UpdateProjectDto = Partial<CreateProject>;
export type UpdatePublicationDto = Partial<CreatePublication>;
export type UpdateRecommendationDto = Partial<CreateRecommendation>;
export type UpdateHackathonDto = Partial<CreateHackathon>;
export type UpdateBugBountyDto = Partial<CreateBugBounty>;
export type UpdateOpenSourceDto = Partial<CreateOpenSource>;
export type UpdateTalkDto = Partial<CreateTalk>;
export type UpdateAwardDto = Partial<CreateAward>;
export type UpdateInterestDto = Partial<CreateInterest>;
