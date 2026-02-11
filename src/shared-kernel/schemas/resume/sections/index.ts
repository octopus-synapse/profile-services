/**
 * Resume Sections Schemas
 *
 * Exports all resume section schemas.
 * Organized alphabetically for easy discovery.
 */

// ============================================================================
// Core Sections (commonly used)
// ============================================================================

// Certification
export {
  type Certification,
  CertificationBaseSchema,
  CertificationSchema,
  type CreateCertification,
  CreateCertificationSchema,
  type UpdateCertification,
  UpdateCertificationSchema,
} from './certification.schema';

// Education
export {
  type CreateEducation,
  CreateEducationSchema,
  type Education,
  EducationBaseSchema,
  EducationSchema,
  type UpdateEducation,
  UpdateEducationSchema,
} from './education.schema';
// Experience
export {
  type CreateExperience,
  CreateExperienceSchema,
  type Experience,
  ExperienceBaseSchema,
  ExperienceSchema,
  type UpdateExperience,
  UpdateExperienceSchema,
} from './experience.schema';

// Language
export {
  type CreateLanguage,
  CreateLanguageSchema,
  type Language,
  LanguageBaseSchema,
  LanguageSchema,
  type UpdateLanguage,
  UpdateLanguageSchema,
} from './language.schema';
// Project
export {
  type CreateProject,
  CreateProjectSchema,
  type Project,
  ProjectBaseSchema,
  ProjectSchema,
  type UpdateProject,
  UpdateProjectSchema,
} from './project.schema';
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
} from './skill.schema';

// ============================================================================
// Advanced Sections (tech professional features)
// ============================================================================

// Achievement
export {
  type Achievement,
  AchievementBaseSchema,
  AchievementSchema,
  type AchievementType,
  AchievementTypeSchema,
  type CreateAchievement,
  CreateAchievementSchema,
  type UpdateAchievement,
  UpdateAchievementSchema,
} from './achievement.schema';

// Award
export {
  type Award,
  AwardBaseSchema,
  AwardSchema,
  type CreateAward,
  CreateAwardSchema,
  type UpdateAward,
  UpdateAwardSchema,
} from './award.schema';

// Bug Bounty
export {
  type BugBounty,
  BugBountyBaseSchema,
  BugBountySchema,
  type CreateBugBounty,
  CreateBugBountySchema,
  type SeverityLevel,
  SeverityLevelSchema,
  type UpdateBugBounty,
  UpdateBugBountySchema,
} from './bug-bounty.schema';

// Hackathon
export {
  type CreateHackathon,
  CreateHackathonSchema,
  type Hackathon,
  HackathonBaseSchema,
  HackathonSchema,
  type UpdateHackathon,
  UpdateHackathonSchema,
} from './hackathon.schema';

// Interest
export {
  type CreateInterest,
  CreateInterestSchema,
  type Interest,
  InterestBaseSchema,
  InterestSchema,
  type UpdateInterest,
  UpdateInterestSchema,
} from './interest.schema';

// Open Source
export {
  type CreateOpenSource,
  CreateOpenSourceSchema,
  type OpenSource,
  OpenSourceBaseSchema,
  type OpenSourceRole,
  OpenSourceRoleSchema,
  OpenSourceSchema,
  type UpdateOpenSource,
  UpdateOpenSourceSchema,
} from './open-source.schema';

// Publication
export {
  type CreatePublication,
  CreatePublicationSchema,
  type Publication,
  PublicationBaseSchema,
  PublicationSchema,
  type PublicationType,
  PublicationTypeSchema,
  type UpdatePublication,
  UpdatePublicationSchema,
} from './publication.schema';

// Recommendation
export {
  type CreateRecommendation,
  CreateRecommendationSchema,
  type Recommendation,
  RecommendationBaseSchema,
  RecommendationSchema,
  type UpdateRecommendation,
  UpdateRecommendationSchema,
} from './recommendation.schema';

// Talk
export {
  type CreateTalk,
  CreateTalkSchema,
  type EventType,
  EventTypeSchema,
  type Talk,
  TalkBaseSchema,
  TalkSchema,
  type UpdateTalk,
  UpdateTalkSchema,
} from './talk.schema';
