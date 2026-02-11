/**
 * Centralized DTOs
 *
 * Single source of truth for all Data Transfer Objects.
 * Both frontend and backend must import from here.
 */

// Auth DTOs (re-exported from schemas for backward compatibility)
export {
  type ChangeEmail,
  ChangeEmailSchema,
  type ChangePassword,
  ChangePasswordSchema,
  type DeleteAccount,
  DeleteAccountSchema,
  type EmailVerification,
  EmailVerificationSchema,
  // Type aliases for backward compatibility
  type ForgotPassword,
  type LoginCredentials,
  LoginCredentialsSchema,
  type NewPassword,
  NewPasswordSchema,
  type RefreshToken,
  RefreshTokenSchema,
  type RegisterCredentials,
  RegisterCredentialsSchema,
  type RequestVerification,
  RequestVerificationSchema,
  type ResetPassword,
  type ResetPasswordRequest,
  ResetPasswordRequestSchema,
  type VerifyEmail,
} from '../schemas/auth';
// Admin DTOs (Backend-specific)
export {
  type ActivityType,
  ActivityTypeSchema,
  type AdminCreateUser,
  AdminCreateUserSchema,
  type AdminResetPassword,
  AdminResetPasswordSchema,
  type AdminStats,
  // Admin Dashboard
  AdminStatsSchema,
  type AdminUpdateRoleRequest,
  AdminUpdateRoleRequestSchema,
  type AdminUpdateUser,
  AdminUpdateUserSchema,
  type AdminUserListItem,
  AdminUserListItemSchema,
  type AdminUserQuery,
  AdminUserQuerySchema,
  type HealthStatus,
  HealthStatusSchema,
  type PaginatedUsers,
  PaginatedUsersSchema,
  type RecentActivity,
  RecentActivitySchema,
  type SystemHealth,
  SystemHealthSchema,
} from './admin.dto';
// Analytics DTOs
export {
  type AnalyticsTimeRange,
  AnalyticsTimeRangeSchema,
  type ATSScoreResponse,
  ATSScoreResponseSchema,
  type BenchmarkOptions,
  BenchmarkOptionsSchema,
  type BenchmarkResponse,
  BenchmarkResponseSchema,
  type DashboardResponse,
  DashboardResponseSchema,
  type ExperienceLevel,
  ExperienceLevelEnum,
  type HistoryQuery,
  HistoryQuerySchema,
  type Industry,
  // Enums
  IndustryEnum,
  type JobMatch,
  type JobMatchResponse,
  JobMatchResponseSchema,
  JobMatchSchema,
  type KeywordOptions,
  KeywordOptionsSchema,
  type KeywordSuggestionsResponse,
  KeywordSuggestionsResponseSchema,
  type Period,
  PeriodEnum,
  type Priority,
  PriorityEnum,
  type ResumeAnalytics,
  // Additional Analytics Types
  ResumeAnalyticsSchema,
  type ScoreProgressionResponse,
  ScoreProgressionResponseSchema,
  type Severity,
  SeverityEnum,
  type ShareAnalytics,
  ShareAnalyticsSchema,
  type SnapshotResponse,
  SnapshotResponseSchema,
  type TrackView,
  // Request schemas
  TrackViewSchema,
  type Trend,
  TrendEnum,
  type UserAnalyticsSummary,
  UserAnalyticsSummarySchema,
  type ViewStatsQuery,
  ViewStatsQuerySchema,
  type ViewStatsResponse,
  // Response schemas
  ViewStatsResponseSchema,
} from './analytics.dto';
// API Response DTOs
export * from './api-response.dto';
// ATS DTOs
export {
  type ATSValidationResult,
  ATSValidationResultSchema,
  type ValidateCV,
  ValidateCVSchema,
  type ValidateOptions,
  ValidateOptionsSchema,
  type Validation,
  type ValidationIssue,
  ValidationIssueSchema,
  type ValidationResponse,
  ValidationResponseSchema,
} from './ats.dto';
// ATS Validation DTOs
export * from './ats-validation.dto';
// Authorization DTOs
export * from './authorization.dto';
// Chat DTOs
export * from './chat.dto';
// Collaboration DTOs
export * from './collaboration.dto';
// Common DTOs (Utilities)
export {
  type DateString,
  DateStringSchema,
  type IdParam,
  IdParamSchema,
  type PaginationQuery,
  PaginationQuerySchema,
  type ReorderItems,
  ReorderItemsSchema,
  type SearchQuery,
  SearchQuerySchema,
} from './common.dto';
// DSL Response DTOs
export * from './dsl-responses.dto';
export * from './enums.dto';
// Export DTOs
export * from './export.dto';
// GDPR DTOs
export * from './gdpr.dto';
// GitHub DTOs
export * from './github.dto';

// MEC DTOs
export {
  type Course,
  type CourseBasic,
  CourseBasicSchema,
  CourseSchema,
  type GrauCount,
  GrauCountSchema,
  type Institution,
  type InstitutionBasic,
  InstitutionBasicSchema,
  InstitutionSchema,
  type InstitutionWithCourses,
  InstitutionWithCoursesSchema,
  type MecStats,
  MecStatsSchema,
  type SyncLog,
  SyncLogSchema,
  type SyncMetadata,
  SyncMetadataSchema,
  type SyncResult,
  SyncResultSchema,
  type SyncStatus,
  SyncStatusSchema,
  type UfCount,
  UfCountSchema,
} from './mec.dto';
// Onboarding Progress DTOs
export {
  type OnboardingCompleteResponseEnvelope,
  OnboardingCompleteResponseSchema,
  type OnboardingProgress,
  type OnboardingProgressResponseEnvelope,
  OnboardingProgressResponseSchema,
  OnboardingProgressSchema,
  type OnboardingResult,
  OnboardingResultSchema,
  type OnboardingStatus,
  type OnboardingStatusResponseEnvelope,
  // Response Envelopes
  OnboardingStatusResponseSchema,
  OnboardingStatusSchema,
  type OnboardingStep,
  OnboardingStepSchema,
  type SaveProgressResult,
  SaveProgressResultSchema,
  type SubmitOnboardingDto,
  SubmitOnboardingDtoSchema,
} from './onboarding-progress.dto';
// Persona DTOs
export * from './persona.dto';

// Public Profile DTOs
export * from './public-profile.dto';
// Resume DTOs
// Resume Update DTOs
export {
  type BulkCreateSkills,
  BulkCreateSkillsSchema,
  type CreateCertification,
  CreateCertificationSchema,
  type CreateEducation,
  CreateEducationSchema,
  type CreateExperience,
  CreateExperienceSchema,
  type CreateLanguage,
  CreateLanguageSchema,
  type CreateProject,
  CreateProjectSchema,
  type CreateResume,
  CreateResumeSchema,
  type CreateSkill,
  CreateSkillSchema,
  type UpdateCertification,
  UpdateCertificationSchema,
  type UpdateEducation,
  UpdateEducationSchema,
  type UpdateExperience,
  UpdateExperienceSchema,
  type UpdateLanguage,
  UpdateLanguageSchema,
  type UpdateProject,
  UpdateProjectSchema,
  type UpdateResume,
  UpdateResumeSchema,
  type UpdateSkill,
  UpdateSkillSchema,
} from './resume.dto';
// Resume Extended DTOs (Advanced Features)
// Resume Extended Update DTOs
export {
  type AchievementType,
  AchievementTypeEnum,
  type BugBountyPlatform,
  BugBountyPlatformEnum,
  type BugBountySeverity,
  BugBountySeverityEnum,
  type CreateAchievement,
  CreateAchievementSchema,
  type CreateAward,
  CreateAwardSchema,
  type CreateBugBounty,
  CreateBugBountySchema,
  type CreateHackathon,
  CreateHackathonSchema,
  type CreateInterest,
  CreateInterestSchema,
  type CreateOpenSource,
  CreateOpenSourceSchema,
  type CreatePublication,
  CreatePublicationSchema,
  type CreateRecommendation,
  CreateRecommendationSchema,
  type CreateTalk,
  CreateTalkSchema,
  type OpenSourceRole,
  OpenSourceRoleEnum,
  type PublicationType,
  PublicationTypeEnum,
  type TalkType,
  TalkTypeEnum,
  type UpdateAchievement,
  UpdateAchievementSchema,
  type UpdateAward,
  UpdateAwardSchema,
  type UpdateBugBounty,
  UpdateBugBountySchema,
  type UpdateHackathon,
  UpdateHackathonSchema,
  type UpdateInterest,
  UpdateInterestSchema,
  type UpdateOpenSource,
  UpdateOpenSourceSchema,
  type UpdatePublication,
  UpdatePublicationSchema,
  type UpdateRecommendation,
  UpdateRecommendationSchema,
  type UpdateTalk,
  UpdateTalkSchema,
} from './resume-extended.dto';
// Resume Import DTOs
export * from './resume-import.dto';
// Search DTOs
export * from './search.dto';
// Section Config DTOs
export * from './section-config.dto';
// Share DTOs
export * from './share.dto';
// Social DTOs
export * from './social.dto';
// Spoken Languages DTOs
export * from './spoken-languages.dto';
// Tech Skills DTOs
export * from './tech-skills.dto';
// Theme DTOs
export {
  type ApplyThemeToResume,
  ApplyThemeToResumeSchema,
  type CreateTheme,
  CreateThemeSchema,
  type ForkTheme,
  ForkThemeSchema,
  type QueryThemes,
  QueryThemesSchema,
  type ReviewTheme,
  type SortDirection,
  SortDirectionSchema,
  type ThemeApplication,
  ThemeApplicationSchema,
  type ThemeApproval,
  ThemeApprovalSchema,
  type ThemeSortField,
  ThemeSortFieldSchema,
  type UpdateTheme,
  UpdateThemeSchema,
} from './theme.dto';
// Translation DTOs
export {
  type BatchTranslationResult,
  BatchTranslationResultSchema,
  type ServiceHealth,
  ServiceHealthSchema,
  type TranslateBatch,
  TranslateBatchSchema,
  type TranslateBatchWithEnum,
  TranslateBatchWithEnumSchema,
  type TranslateText,
  TranslateTextSchema,
  type TranslateTextWithEnum,
  TranslateTextWithEnumSchema,
  type TranslationLanguage,
  TranslationLanguageEnum,
  type TranslationResult,
  TranslationResultSchema,
} from './translation.dto';
// Two-Factor DTOs
export * from './two-factor.dto';
// User DTOs
export {
  type AdminUserFilters,
  AdminUserFiltersSchema,
  type CheckUsernameResponse,
  CheckUsernameResponseSchema,
  type UpdateUser,
  type UpdateUsernameRequest,
  UpdateUsernameRequestSchema,
  type UpdateUsernameResponse,
  UpdateUsernameResponseSchema,
  UpdateUserSchema,
  type UploadImageResponse,
  type UploadImageResponseEnvelope,
  UploadImageResponseSchema,
  UploadImageResponseWrapperSchema,
  type UsernameValidationError,
  UsernameValidationErrorSchema,
  type UserStats,
  UserStatsSchema,
  type ValidateUsernameRequest,
  ValidateUsernameRequestSchema,
  type ValidateUsernameResponse,
  ValidateUsernameResponseSchema,
} from './user.dto';
// User Profile DTOs
export {
  type UpdateFullPreferences,
  UpdateFullPreferencesSchema,
  type UpdatePreferences,
  UpdatePreferencesSchema,
  type UpdateProfile,
  UpdateProfileSchema,
  type UpdateUsername,
  UpdateUsernameSchema,
} from './user-profile.dto';
