/**
 * Shared Kernel
 *
 * Central exports for all shared code.
 *
 * NOTE: To avoid duplicate export conflicts, import from specific modules:
 * - '@/shared-kernel/constants' - App config, error messages
 * - '@/shared-kernel/enums' - Domain enums
 * - '@/shared-kernel/schemas' - Zod validation schemas
 * - '@/shared-kernel/dtos' - Data transfer objects
 * - '@/shared-kernel/types' - TypeScript types
 * - '@/shared-kernel/validations' - Validation utilities
 */

// AST schemas (Resume AST)
export * from './ast';

// Constants (no conflicts)
export * from './constants';
// DSL schemas (Resume DSL)
export * from './dsl';
// DTOs - Selective exports to avoid conflicts with schemas/enums
// These are DTOs that are ONLY defined in dtos/ and don't conflict
export {
  type ActivityType,
  ActivityTypeSchema,
  type AdminCreateUser,
  // Admin
  AdminCreateUserSchema,
  type AdminResetPassword,
  AdminResetPasswordSchema,
  type AdminStats,
  AdminStatsSchema,
  type AdminUpdateRoleRequest,
  AdminUpdateRoleRequestSchema,
  type AdminUpdateUser,
  AdminUpdateUserSchema,
  type AdminUserListItem,
  AdminUserListItemSchema,
  type AdminUserQuery,
  AdminUserQuerySchema,
  type ApplyThemeToResume,
  ApplyThemeToResumeSchema,
  type ATSScoreResponse,
  ATSScoreResponseSchema,
  type BenchmarkOptions,
  BenchmarkOptionsSchema,
  type BenchmarkResponse,
  BenchmarkResponseSchema,
  type BlockedUserResponse,
  type BlockUser,
  // Chat - Block
  BlockUserSchema,
  // Chat - Responses
  type ConversationResponse,
  type Course,
  type CourseBasic,
  CourseBasicSchema,
  CourseSchema,
  type CreateTheme,
  // Theme
  CreateThemeSchema,
  type DashboardResponse,
  DashboardResponseSchema,
  type DateString,
  DateStringSchema,
  type ForkTheme,
  ForkThemeSchema,
  type GetConversationsQuery,
  GetConversationsQuerySchema,
  type GetMessagesQuery,
  GetMessagesQuerySchema,
  type HealthStatus,
  HealthStatusSchema,
  type HistoryQuery,
  HistoryQuerySchema,
  type IdParam,
  IdParamSchema,
  type Institution,
  // MEC
  InstitutionSchema,
  type InstitutionWithCourses,
  InstitutionWithCoursesSchema,
  type JobMatch,
  type JobMatchResponse,
  JobMatchResponseSchema,
  JobMatchSchema,
  type KeywordOptions,
  KeywordOptionsSchema,
  type KeywordSuggestionsResponse,
  KeywordSuggestionsResponseSchema,
  type MecStats,
  MecStatsSchema,
  type MessageResponse,
  type OnboardingProgress,
  OnboardingProgressSchema,
  type OnboardingResult,
  OnboardingResultSchema,
  type OnboardingStatus,
  OnboardingStatusSchema,
  type OnboardingStep,
  // Onboarding
  OnboardingStepSchema,
  type PaginatedConversationsResponse,
  type PaginatedMessagesResponse,
  type PaginatedUsers,
  PaginatedUsersSchema,
  type PaginationQuery,
  // Common
  PaginationQuerySchema,
  type QueryThemes,
  QueryThemesSchema,
  type RecentActivity,
  RecentActivitySchema,
  type ReorderItems,
  ReorderItemsSchema,
  type ReviewTheme,
  type ScoreProgressionResponse,
  ScoreProgressionResponseSchema,
  type SearchQuery,
  SearchQuerySchema,
  type SendMessage,
  // Chat
  SendMessageSchema,
  type SendMessageToConversation,
  SendMessageToConversationSchema,
  type SnapshotResponse,
  SnapshotResponseSchema,
  type SystemHealth,
  SystemHealthSchema,
  type ThemeApplication,
  ThemeApplicationSchema,
  type ThemeApproval,
  ThemeApprovalSchema,
  type TrackView,
  // Analytics
  TrackViewSchema,
  type TranslateBatch,
  TranslateBatchSchema,
  type TranslateText,
  // Translation
  TranslateTextSchema,
  type UpdateFullPreferences,
  UpdateFullPreferencesSchema,
  type UpdatePreferences,
  UpdatePreferencesSchema,
  type UpdateProfile,
  // User Profile
  UpdateProfileSchema,
  type UpdateTheme,
  UpdateThemeSchema,
  type UpdateUser,
  type UpdateUsername,
  UpdateUsernameSchema,
  // User
  UpdateUserSchema,
  type UsernameValidationError,
  UsernameValidationErrorSchema,
  type ValidateCV,
  // ATS
  ValidateCVSchema,
  type ValidateUsernameRequest,
  // Username Validation
  ValidateUsernameRequestSchema,
  type ValidateUsernameResponse,
  ValidateUsernameResponseSchema,
  type Validation,
  type ValidationIssue,
  ValidationIssueSchema,
  type ValidationResponse,
  ValidationResponseSchema,
  type ViewStatsQuery,
  ViewStatsQuerySchema,
  type ViewStatsResponse,
  ViewStatsResponseSchema,
  // Chat - WebSocket
  type WsTypingEvent,
} from './dtos';
// SDK Response DTOs (for @ApiResponse decorators)
export * from './dtos/sdk-response.dto';
// Enums (canonical source)
export * from './enums';
// Event Bus
export {
  DomainEvent,
  EventBusModule,
  EventPublisher,
  type EventPublisherPort,
} from './event-bus';
// Schemas (canonical source)
export * from './schemas';
// Types (API types, etc.)
export * from './types';
// Validation utilities
export * from './validation';
// Validations (domain validation schemas)
export * from './validations';
