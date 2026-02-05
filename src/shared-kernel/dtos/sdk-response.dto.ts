/**
 * SDK Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These DTOs are used by @ApiResponse decorators to document return types.
 *
 * DESIGN DECISION: All API responses are documented with explicit DTOs.
 * This enables automatic SDK generation with proper TypeScript types.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// COMMON RESPONSE DTOs
// ============================================================================

export class DeleteResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: 'Resource deleted successfully' })
  message?: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  timestamp?: string;
}

// ============================================================================
// USER RESPONSE DTOs
// ============================================================================

export class UserProfileResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  photoURL?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  bio?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.com' })
  website?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  github?: string;

  @ApiPropertyOptional({ example: 'https://twitter.com/johndoe' })
  twitter?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class PublicProfileResponseDto {
  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  photoURL?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  bio?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;
}

export class UserPreferencesResponseDto {
  @ApiPropertyOptional({ example: 'dark' })
  palette?: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  bannerColor?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  photoURL?: string;
}

export class UserFullPreferencesResponseDto extends UserPreferencesResponseDto {
  @ApiPropertyOptional({ example: 'en' })
  language?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  timezone?: string;

  @ApiPropertyOptional({ example: true })
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  marketingEmails?: boolean;
}

export class UsernameUpdateResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'newusername' })
  username!: string;
}

export class UsernameValidationResponseDto {
  @ApiProperty({ example: true })
  available!: boolean;

  @ApiPropertyOptional({ example: 'Username is already taken' })
  message?: string;
}

export class UserListItemDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN', 'MODERATOR'] })
  role!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class UserDetailsResponseDto extends UserProfileResponseDto {
  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN', 'MODERATOR'] })
  role!: string;

  @ApiProperty({ example: true })
  emailVerified!: boolean;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  lastLoginAt?: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN', 'MODERATOR'] })
  role!: string;

  @ApiProperty({ example: true })
  emailVerified!: boolean;
}

// ============================================================================
// AUTH RESPONSE DTOs
// ============================================================================

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiPropertyOptional({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken?: string;

  @ApiProperty({ type: CurrentUserResponseDto })
  user!: CurrentUserResponseDto;
}

export class TwoFactorSetupResponseDto {
  @ApiProperty({ example: 'otpauth://totp/...' })
  otpauthUrl!: string;

  @ApiProperty({ example: 'JBSWY3DPEHPK3PXP' })
  secret!: string;

  @ApiProperty({ type: [String], example: ['abc123', 'def456'] })
  backupCodes!: string[];
}

// ============================================================================
// RESUME RESPONSE DTOs
// ============================================================================

export class ResumeResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'My Resume' })
  title!: string;

  @ApiPropertyOptional({ example: 'en' })
  language?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  targetRole?: string;

  @ApiProperty({ example: false })
  isPublic!: boolean;

  @ApiPropertyOptional({ example: 'my-resume-slug' })
  slug?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class ResumeListItemDto extends ResumeResponseDto {
  @ApiPropertyOptional({ example: 5 })
  viewCount?: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  lastViewedAt?: string;
}

export class ResumeSlotsResponseDto {
  @ApiProperty({ example: 2 })
  used!: number;

  @ApiProperty({ example: 4 })
  limit!: number;

  @ApiProperty({ example: 2 })
  remaining!: number;
}

export class ExperienceResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'Software Engineer' })
  title!: string;

  @ApiProperty({ example: 'Tech Company' })
  company!: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;

  @ApiPropertyOptional({ example: '2020-01-01' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2023-12-31' })
  endDate?: string;

  @ApiPropertyOptional({ example: true })
  current?: boolean;

  @ApiPropertyOptional({ example: 'Developed and maintained...' })
  description?: string;

  @ApiProperty({ example: 0 })
  order!: number;
}

export class EducationResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'Stanford University' })
  institution!: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  degree?: string;

  @ApiPropertyOptional({ example: 'Bachelor' })
  field?: string;

  @ApiPropertyOptional({ example: '2016-09-01' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2020-06-15' })
  endDate?: string;

  @ApiPropertyOptional({ example: '3.8' })
  gpa?: string;

  @ApiPropertyOptional({ example: 'Graduated with honors' })
  description?: string;

  @ApiProperty({ example: 0 })
  order!: number;
}

export class SkillResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiPropertyOptional({ example: 'expert' })
  level?: string;

  @ApiPropertyOptional({ example: 'programming' })
  category?: string;

  @ApiProperty({ example: 0 })
  order!: number;
}

export class ResumeFullResponseDto extends ResumeResponseDto {
  @ApiProperty({ type: [ExperienceResponseDto] })
  experiences!: ExperienceResponseDto[];

  @ApiProperty({ type: [EducationResponseDto] })
  educations!: EducationResponseDto[];

  @ApiProperty({ type: [SkillResponseDto] })
  skills!: SkillResponseDto[];

  @ApiPropertyOptional({ example: 'John Doe' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;

  @ApiPropertyOptional({ example: 'Experienced software engineer...' })
  summary?: string;
}

export class ResumeSkillResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'clxxx...' })
  resumeId!: string;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiPropertyOptional({ example: 'expert' })
  level?: string;

  @ApiPropertyOptional({ example: 'programming' })
  category?: string;

  @ApiProperty({ example: 0 })
  order!: number;
}

// ============================================================================
// THEME RESPONSE DTOs
// ============================================================================

export class ThemeResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'Modern Dark' })
  name!: string;

  @ApiPropertyOptional({ example: 'A sleek dark theme' })
  description?: string;

  @ApiProperty({ example: false })
  isSystem!: boolean;

  @ApiProperty({ example: false })
  isPublic!: boolean;

  @ApiPropertyOptional({ example: {} })
  config?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class SystemThemeResponseDto extends ThemeResponseDto {
  @ApiProperty({ example: true })
  isSystem!: boolean;

  @ApiPropertyOptional({ example: true })
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/preview.jpg' })
  previewUrl?: string;
}

export class ThemeApprovalResponseDto extends ThemeResponseDto {
  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  status!: string;

  @ApiPropertyOptional({ example: 'Needs improvement' })
  reviewNotes?: string;
}

export class SectionConfigResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'experience' })
  sectionType!: string;

  @ApiProperty({ example: true })
  visible!: boolean;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiPropertyOptional({ example: {} })
  config?: Record<string, unknown>;
}

// ============================================================================
// ANALYTICS RESPONSE DTOs
// ============================================================================

export class TrackEventResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'clxxx...' })
  eventId!: string;
}

export class ResumeViewsResponseDto {
  @ApiProperty({ example: 150 })
  total!: number;

  @ApiProperty({ example: 25 })
  unique!: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  lastViewedAt?: string;
}

export class ResumeViewsByPeriodDto {
  @ApiProperty({ example: '2024-01-01' })
  date!: string;

  @ApiProperty({ example: 10 })
  views!: number;
}

export class PopularSectionsResponseDto {
  @ApiProperty({ example: 'experience' })
  section!: string;

  @ApiProperty({ example: 45 })
  engagements!: number;

  @ApiProperty({ example: 120 })
  averageTimeSeconds!: number;
}

export class EngagementResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'clxxx...' })
  engagementId!: string;
}

export class EngagementMetricsResponseDto {
  @ApiProperty({ example: 120 })
  averageTimeOnPage!: number;

  @ApiProperty({ example: 0.65 })
  scrollDepth!: number;

  @ApiProperty({ example: 3.5 })
  clicksPerView!: number;
}

export class EventHistoryResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'PAGE_VIEW' })
  eventType!: string;

  @ApiProperty({ example: {} })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class GeographicDistributionDto {
  @ApiProperty({ example: 'US' })
  country!: string;

  @ApiProperty({ example: 45 })
  count!: number;

  @ApiProperty({ example: 0.3 })
  percentage!: number;
}

export class DeviceStatsResponseDto {
  @ApiProperty({ example: 'desktop' })
  device!: string;

  @ApiProperty({ example: 65 })
  count!: number;

  @ApiProperty({ example: 0.65 })
  percentage!: number;
}

// ============================================================================
// COLLABORATION RESPONSE DTOs
// ============================================================================

export class CollaboratorResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'clxxx...' })
  userId!: string;

  @ApiProperty({ example: 'clxxx...' })
  resumeId!: string;

  @ApiProperty({ example: 'EDITOR', enum: ['VIEWER', 'EDITOR', 'ADMIN'] })
  role!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class SharedResumeResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  resumeId!: string;

  @ApiProperty({ example: 'My Resume' })
  resumeTitle!: string;

  @ApiProperty({ example: 'clxxx...' })
  ownerId!: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  ownerName?: string;

  @ApiProperty({ example: 'VIEWER', enum: ['VIEWER', 'EDITOR', 'ADMIN'] })
  role!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  sharedAt!: string;
}

// ============================================================================
// CHAT RESPONSE DTOs
// ============================================================================

export class ChatMessageResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'clxxx...' })
  conversationId!: string;

  @ApiProperty({ example: 'clxxx...' })
  senderId!: string;

  @ApiProperty({ example: 'Hello, how are you?' })
  content!: string;

  @ApiProperty({ example: false })
  read!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class ConversationResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'clxxx...' })
  participantId!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  participantName?: string;

  @ApiPropertyOptional({ example: 'Last message preview...' })
  lastMessage?: string;

  @ApiProperty({ example: 2 })
  unreadCount!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class ConversationDetailResponseDto extends ConversationResponseDto {
  @ApiProperty({ type: [ChatMessageResponseDto] })
  messages!: ChatMessageResponseDto[];
}

export class MarkAsReadResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 5 })
  messagesMarked!: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count!: number;
}

export class BlockUserResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'clxxx...' })
  blockedUserId!: string;
}

export class BlockedUserResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  userId!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  blockedAt!: string;
}

export class IsBlockedResponseDto {
  @ApiProperty({ example: false })
  isBlocked!: boolean;
}

// ============================================================================
// ONBOARDING RESPONSE DTOs
// ============================================================================

export class OnboardingStepResponseDto {
  @ApiProperty({ example: 'PROFILE_SETUP' })
  stepId!: string;

  @ApiProperty({ example: 'Set up your profile' })
  title!: string;

  @ApiPropertyOptional({ example: 'Add your name and photo' })
  description?: string;

  @ApiProperty({ example: true })
  completed!: boolean;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  completedAt?: string;
}

export class OnboardingProgressResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  userId!: string;

  @ApiProperty({ example: 3 })
  currentStep!: number;

  @ApiProperty({ example: 5 })
  totalSteps!: number;

  @ApiProperty({ example: 60 })
  progressPercentage!: number;

  @ApiProperty({ example: false })
  completed!: boolean;

  @ApiProperty({ type: [OnboardingStepResponseDto] })
  steps!: OnboardingStepResponseDto[];
}

// ============================================================================
// CONSENT RESPONSE DTOs
// ============================================================================

export class ConsentResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'TERMS_OF_SERVICE' })
  type!: string;

  @ApiProperty({ example: '1.0' })
  version!: string;

  @ApiProperty({ example: true })
  accepted!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  acceptedAt!: string;
}

export class ConsentHistoryResponseDto extends ConsentResponseDto {
  @ApiPropertyOptional({ example: '192.168.1.1' })
  ipAddress?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  userAgent?: string;
}

// ============================================================================
// GDPR RESPONSE DTOs
// ============================================================================

export class GdprExportResponseDto {
  @ApiProperty({ example: 'https://example.com/download/export.zip' })
  downloadUrl!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  expiresAt!: string;
}

// ============================================================================
// IMPORT RESPONSE DTOs
// ============================================================================

export class ImportJobDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  status!: string;

  @ApiProperty({ example: 'JSON', enum: ['JSON', 'PDF', 'LINKEDIN'] })
  source!: string;

  @ApiPropertyOptional({ example: 'clxxx...' })
  resumeId?: string;

  @ApiPropertyOptional({ example: 'Invalid format' })
  error?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  completedAt?: string;
}

export class ImportResultDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'clxxx...' })
  resumeId!: string;

  @ApiPropertyOptional({ example: 5 })
  experiencesImported?: number;

  @ApiPropertyOptional({ example: 2 })
  educationsImported?: number;

  @ApiPropertyOptional({ example: 10 })
  skillsImported?: number;

  @ApiPropertyOptional({ type: [String], example: ['Unknown field: hobby'] })
  warnings?: string[];
}

export class ValidationResultDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['Missing required field: name'],
  })
  errors?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Field "objective" is deprecated'],
  })
  warnings?: string[];
}

// ============================================================================
// EXPORT RESPONSE DTOs
// ============================================================================

export class ExportResultDto {
  @ApiProperty({ example: 'https://example.com/download/resume.pdf' })
  downloadUrl!: string;

  @ApiProperty({ example: 'application/pdf' })
  contentType!: string;

  @ApiPropertyOptional({ example: 'resume.pdf' })
  filename?: string;

  @ApiPropertyOptional({ example: 102400 })
  size?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  expiresAt!: string;
}

export class BannerPreviewResponseDto {
  @ApiProperty({ example: 'https://example.com/banner.png' })
  imageUrl!: string;

  @ApiProperty({ example: 1200 })
  width!: number;

  @ApiProperty({ example: 630 })
  height!: number;
}

// ============================================================================
// DSL RESPONSE DTOs
// ============================================================================

export class DslRenderResponseDto {
  @ApiProperty({ example: '<div class="resume">...</div>' })
  html!: string;

  @ApiPropertyOptional({ example: '.resume { ... }' })
  css?: string;
}

export class DslParseResponseDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiPropertyOptional({ example: {} })
  ast?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String], example: ['Syntax error at line 5'] })
  errors?: string[];
}

export class DslValidationResponseDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiPropertyOptional({ type: [String], example: ['Unknown directive @foo'] })
  errors?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Deprecated syntax'] })
  warnings?: string[];
}

export class DslSuggestionResponseDto {
  @ApiProperty({ example: '@section' })
  text!: string;

  @ApiPropertyOptional({ example: 'Create a new section' })
  description?: string;

  @ApiPropertyOptional({ example: 'directive' })
  type?: string;
}

// ============================================================================
// TRANSLATION RESPONSE DTOs
// ============================================================================

export class TranslationResponseDto {
  @ApiProperty({ example: 'Translated text here' })
  text!: string;

  @ApiProperty({ example: 'en' })
  sourceLanguage!: string;

  @ApiProperty({ example: 'pt' })
  targetLanguage!: string;
}

export class BatchTranslationResponseDto {
  @ApiProperty({ type: [TranslationResponseDto] })
  translations!: TranslationResponseDto[];

  @ApiProperty({ example: 5 })
  count!: number;
}

// ============================================================================
// TECH SKILLS RESPONSE DTOs
// ============================================================================

export class TechSkillDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiPropertyOptional({ example: 'typescript' })
  slug?: string;

  @ApiPropertyOptional({ example: 'programming_language' })
  type?: string;

  @ApiPropertyOptional({ example: 'https://example.com/icon.svg' })
  iconUrl?: string;

  @ApiPropertyOptional({ example: '#3178c6' })
  color?: string;
}

export class TechNicheDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'Frontend Development' })
  name!: string;

  @ApiPropertyOptional({ example: 'frontend-development' })
  slug?: string;

  @ApiPropertyOptional({ example: 'clxxx...' })
  areaId?: string;

  @ApiProperty({ type: [TechSkillDto] })
  skills!: TechSkillDto[];
}

export class TechAreaDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'Software Development' })
  name!: string;

  @ApiPropertyOptional({ example: 'software-development' })
  slug?: string;

  @ApiProperty({ type: [TechNicheDto] })
  niches!: TechNicheDto[];
}

// ============================================================================
// MEC RESPONSE DTOs
// ============================================================================

export class MecInstitutionDto {
  @ApiProperty({ example: 12345 })
  id!: number;

  @ApiProperty({ example: 'Universidade Federal de São Paulo' })
  name!: string;

  @ApiPropertyOptional({ example: 'UNIFESP' })
  acronym?: string;

  @ApiPropertyOptional({ example: 'SP' })
  stateCode?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  city?: string;

  @ApiProperty({ example: 5 })
  iguGeral!: number;
}

export class MecCourseDto {
  @ApiProperty({ example: 67890 })
  id!: number;

  @ApiProperty({ example: 'Ciência da Computação' })
  name!: string;

  @ApiPropertyOptional({ example: 'Bacharelado' })
  degree?: string;

  @ApiPropertyOptional({ example: 'Presencial' })
  modality?: string;

  @ApiProperty({ example: 12345 })
  institutionId!: number;

  @ApiPropertyOptional({ example: 4 })
  cpc?: number;

  @ApiPropertyOptional({ example: 5 })
  enade?: number;
}

export class StateCodeResponseDto {
  @ApiProperty({ example: 'SP' })
  code!: string;

  @ApiProperty({ example: 'São Paulo' })
  name!: string;
}

export class KnowledgeAreaResponseDto {
  @ApiProperty({ example: 'ENGENHARIA' })
  code!: string;

  @ApiProperty({ example: 'Engenharia e Tecnologia' })
  name!: string;
}

export class MecStatisticsResponseDto {
  @ApiProperty({ example: 2500 })
  totalInstitutions!: number;

  @ApiProperty({ example: 45000 })
  totalCourses!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  lastSyncAt!: string;
}

export class MecSyncStatusResponseDto {
  @ApiProperty({
    example: 'RUNNING',
    enum: ['IDLE', 'RUNNING', 'COMPLETED', 'FAILED'],
  })
  status!: string;

  @ApiPropertyOptional({ example: 75 })
  progress?: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  startedAt?: string;

  @ApiPropertyOptional({ example: 'Syncing institutions...' })
  currentTask?: string;
}

export class MecSyncHistoryResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'COMPLETED', enum: ['COMPLETED', 'FAILED'] })
  status!: string;

  @ApiProperty({ example: 2500 })
  recordsProcessed!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  startedAt!: string;

  @ApiProperty({ example: '2024-01-01T01:30:00.000Z' })
  completedAt!: string;
}

// ============================================================================
// GITHUB RESPONSE DTOs
// ============================================================================

export class GitHubAuthUrlResponseDto {
  @ApiProperty({ example: 'https://github.com/login/oauth/authorize?...' })
  authUrl!: string;
}

export class GitHubCallbackResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: 'octocat' })
  username?: string;

  @ApiPropertyOptional({ example: 'https://github.com/octocat' })
  profileUrl?: string;
}

export class GitHubImportResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: 25 })
  repositoriesImported?: number;

  @ApiPropertyOptional({ example: 5 })
  contributionsImported?: number;
}

export class GitHubConnectionStatusDto {
  @ApiProperty({ example: true })
  connected!: boolean;

  @ApiPropertyOptional({ example: 'octocat' })
  username?: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  connectedAt?: string;
}

// ============================================================================
// UPLOAD RESPONSE DTOs
// ============================================================================

export class FileUploadResponseDto {
  @ApiProperty({ example: 'https://cdn.example.com/files/abc123.pdf' })
  url!: string;

  @ApiProperty({ example: 'abc123.pdf' })
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  contentType!: string;

  @ApiProperty({ example: 102400 })
  size!: number;
}

export class ImageUploadResponseDto extends FileUploadResponseDto {
  @ApiPropertyOptional({ example: 800 })
  width?: number;

  @ApiPropertyOptional({ example: 600 })
  height?: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/thumbs/abc123.jpg' })
  thumbnailUrl?: string;
}

// ============================================================================
// ATS RESPONSE DTOs
// ============================================================================

export class AtsValidationResponseDto {
  @ApiProperty({ example: 85 })
  score!: number;

  @ApiProperty({ example: 'GOOD', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] })
  rating!: string;

  @ApiProperty({
    type: [String],
    example: ['Add more keywords for Software Engineer role'],
  })
  suggestions!: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Missing contact information'],
  })
  issues?: string[];

  @ApiPropertyOptional({ example: {} })
  breakdown?: Record<string, unknown>;
}

// ============================================================================
// PLATFORM STATS RESPONSE DTOs
// ============================================================================

export class PlatformStatsResponseDto {
  @ApiProperty({ example: 15000 })
  totalUsers!: number;

  @ApiProperty({ example: 45000 })
  totalResumes!: number;

  @ApiProperty({ example: 1500000 })
  totalViews!: number;

  @ApiProperty({ example: 250 })
  activeUsersToday!: number;

  @ApiProperty({ example: 1500 })
  activeUsersWeek!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}
