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

// Event Bus
export {
  EventBusModule,
  EventPublisher,
  type EventPublisherPort,
  DomainEvent,
} from './event-bus';

// Constants (no conflicts)
export * from './constants';

// Enums (canonical source)
export * from './enums';

// Schemas (canonical source)
export * from './schemas';

// DSL schemas (Resume DSL)
export * from './dsl';

// AST schemas (Resume AST)
export * from './ast';

// Types (API types, etc.)
export * from './types';

// Validations (domain validation schemas)
export * from './validations';

// Validation utilities
export * from './validation';

// DTOs - Selective exports to avoid conflicts with schemas/enums
// These are DTOs that are ONLY defined in dtos/ and don't conflict
export {
  // Admin
  AdminCreateUserSchema,
  type AdminCreateUser,
  AdminUpdateUserSchema,
  type AdminUpdateUser,
  AdminResetPasswordSchema,
  type AdminResetPassword,
  AdminUserQuerySchema,
  type AdminUserQuery,
  AdminUpdateRoleRequestSchema,
  type AdminUpdateRoleRequest,
  AdminUserListItemSchema,
  type AdminUserListItem,
  PaginatedUsersSchema,
  type PaginatedUsers,
  AdminStatsSchema,
  type AdminStats,
  ActivityTypeSchema,
  type ActivityType,
  RecentActivitySchema,
  type RecentActivity,
  HealthStatusSchema,
  type HealthStatus,
  SystemHealthSchema,
  type SystemHealth,
  // Common
  PaginationQuerySchema,
  type PaginationQuery,
  ReorderItemsSchema,
  type ReorderItems,
  DateStringSchema,
  type DateString,
  IdParamSchema,
  type IdParam,
  SearchQuerySchema,
  type SearchQuery,
  // User
  UpdateUserSchema,
  type UpdateUser,
  // User Profile
  UpdateProfileSchema,
  type UpdateProfile,
  UpdatePreferencesSchema,
  type UpdatePreferences,
  UpdateFullPreferencesSchema,
  type UpdateFullPreferences,
  UpdateUsernameSchema,
  type UpdateUsername,
  // Username Validation
  ValidateUsernameRequestSchema,
  type ValidateUsernameRequest,
  ValidateUsernameResponseSchema,
  type ValidateUsernameResponse,
  UsernameValidationErrorSchema,
  type UsernameValidationError,
  // Theme
  CreateThemeSchema,
  type CreateTheme,
  UpdateThemeSchema,
  type UpdateTheme,
  QueryThemesSchema,
  type QueryThemes,
  ThemeApplicationSchema,
  type ThemeApplication,
  ThemeApprovalSchema,
  type ThemeApproval,
  ApplyThemeToResumeSchema,
  type ApplyThemeToResume,
  ForkThemeSchema,
  type ForkTheme,
  type ReviewTheme,
  // Onboarding
  OnboardingStepSchema,
  type OnboardingStep,
  OnboardingProgressSchema,
  type OnboardingProgress,
  OnboardingStatusSchema,
  type OnboardingStatus,
  OnboardingResultSchema,
  type OnboardingResult,
  // Analytics
  TrackViewSchema,
  type TrackView,
  ViewStatsQuerySchema,
  type ViewStatsQuery,
  KeywordOptionsSchema,
  type KeywordOptions,
  JobMatchSchema,
  type JobMatch,
  BenchmarkOptionsSchema,
  type BenchmarkOptions,
  HistoryQuerySchema,
  type HistoryQuery,
  ViewStatsResponseSchema,
  type ViewStatsResponse,
  ATSScoreResponseSchema,
  type ATSScoreResponse,
  KeywordSuggestionsResponseSchema,
  type KeywordSuggestionsResponse,
  JobMatchResponseSchema,
  type JobMatchResponse,
  BenchmarkResponseSchema,
  type BenchmarkResponse,
  DashboardResponseSchema,
  type DashboardResponse,
  SnapshotResponseSchema,
  type SnapshotResponse,
  ScoreProgressionResponseSchema,
  type ScoreProgressionResponse,
  // Translation
  TranslateTextSchema,
  type TranslateText,
  TranslateBatchSchema,
  type TranslateBatch,
  // MEC
  InstitutionSchema,
  type Institution,
  CourseBasicSchema,
  type CourseBasic,
  InstitutionWithCoursesSchema,
  type InstitutionWithCourses,
  CourseSchema,
  type Course,
  MecStatsSchema,
  type MecStats,
  // Chat
  SendMessageSchema,
  type SendMessage,
  SendMessageToConversationSchema,
  type SendMessageToConversation,
  GetMessagesQuerySchema,
  type GetMessagesQuery,
  GetConversationsQuerySchema,
  type GetConversationsQuery,
  // Chat - Block
  BlockUserSchema,
  type BlockUser,
  type BlockedUserResponse,
  // Chat - Responses
  type ConversationResponse,
  type MessageResponse,
  type PaginatedMessagesResponse,
  type PaginatedConversationsResponse,
  // Chat - WebSocket
  type WsTypingEvent,
  // ATS
  ValidateCVSchema,
  type ValidateCV,
  ValidationIssueSchema,
  type ValidationIssue,
  ValidationResponseSchema,
  type ValidationResponse,
  type Validation,
} from './dtos';

// SDK Response DTOs (for @ApiResponse decorators)
export * from './dtos/sdk-response.dto';
