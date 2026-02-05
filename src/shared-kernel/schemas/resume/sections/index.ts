/**
 * Resume Sections Schemas
 *
 * Exports all resume section schemas.
 * Organized alphabetically for easy discovery.
 */

// ============================================================================
// Core Sections (commonly used)
// ============================================================================

// Experience
export {
 ExperienceBaseSchema,
 CreateExperienceSchema,
 UpdateExperienceSchema,
 ExperienceSchema,
 type CreateExperience,
 type UpdateExperience,
 type Experience,
} from "./experience.schema";

// Education
export {
 EducationBaseSchema,
 CreateEducationSchema,
 UpdateEducationSchema,
 EducationSchema,
 type CreateEducation,
 type UpdateEducation,
 type Education,
} from "./education.schema";

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
} from "./skill.schema";

// Language
export {
 LanguageBaseSchema,
 CreateLanguageSchema,
 UpdateLanguageSchema,
 LanguageSchema,
 type CreateLanguage,
 type UpdateLanguage,
 type Language,
} from "./language.schema";

// Certification
export {
 CertificationBaseSchema,
 CreateCertificationSchema,
 UpdateCertificationSchema,
 CertificationSchema,
 type CreateCertification,
 type UpdateCertification,
 type Certification,
} from "./certification.schema";

// Project
export {
 ProjectBaseSchema,
 CreateProjectSchema,
 UpdateProjectSchema,
 ProjectSchema,
 type CreateProject,
 type UpdateProject,
 type Project,
} from "./project.schema";

// ============================================================================
// Advanced Sections (tech professional features)
// ============================================================================

// Achievement
export {
 AchievementTypeSchema,
 AchievementBaseSchema,
 CreateAchievementSchema,
 UpdateAchievementSchema,
 AchievementSchema,
 type AchievementType,
 type CreateAchievement,
 type UpdateAchievement,
 type Achievement,
} from "./achievement.schema";

// Award
export {
 AwardBaseSchema,
 CreateAwardSchema,
 UpdateAwardSchema,
 AwardSchema,
 type CreateAward,
 type UpdateAward,
 type Award,
} from "./award.schema";

// Bug Bounty
export {
 SeverityLevelSchema,
 BugBountyBaseSchema,
 CreateBugBountySchema,
 UpdateBugBountySchema,
 BugBountySchema,
 type SeverityLevel,
 type CreateBugBounty,
 type UpdateBugBounty,
 type BugBounty,
} from "./bug-bounty.schema";

// Hackathon
export {
 HackathonBaseSchema,
 CreateHackathonSchema,
 UpdateHackathonSchema,
 HackathonSchema,
 type CreateHackathon,
 type UpdateHackathon,
 type Hackathon,
} from "./hackathon.schema";

// Interest
export {
 InterestBaseSchema,
 CreateInterestSchema,
 UpdateInterestSchema,
 InterestSchema,
 type CreateInterest,
 type UpdateInterest,
 type Interest,
} from "./interest.schema";

// Open Source
export {
 OpenSourceRoleSchema,
 OpenSourceBaseSchema,
 CreateOpenSourceSchema,
 UpdateOpenSourceSchema,
 OpenSourceSchema,
 type OpenSourceRole,
 type CreateOpenSource,
 type UpdateOpenSource,
 type OpenSource,
} from "./open-source.schema";

// Publication
export {
 PublicationTypeSchema,
 PublicationBaseSchema,
 CreatePublicationSchema,
 UpdatePublicationSchema,
 PublicationSchema,
 type PublicationType,
 type CreatePublication,
 type UpdatePublication,
 type Publication,
} from "./publication.schema";

// Recommendation
export {
 RecommendationBaseSchema,
 CreateRecommendationSchema,
 UpdateRecommendationSchema,
 RecommendationSchema,
 type CreateRecommendation,
 type UpdateRecommendation,
 type Recommendation,
} from "./recommendation.schema";

// Talk
export {
 EventTypeSchema,
 TalkBaseSchema,
 CreateTalkSchema,
 UpdateTalkSchema,
 TalkSchema,
 type EventType,
 type CreateTalk,
 type UpdateTalk,
 type Talk,
} from "./talk.schema";
