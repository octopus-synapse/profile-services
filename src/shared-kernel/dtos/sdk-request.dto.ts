/**
 * SDK Request DTOs
 *
 * Data Transfer Objects for API request bodies.
 * These DTOs are used by @ApiBody decorators to document request bodies
 * and enable automatic SDK generation with proper TypeScript types.
 *
 * Each DTO corresponds to a Zod schema for runtime validation.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// CHAT REQUEST DTOs
// ============================================================================

/**
 * Request DTO for sending a message to a user
 * @see SendMessageSchema in chat.dto.ts
 */
export class SendMessageRequestDto {
  @ApiProperty({
    description: 'The ID of the user to send the message to',
    example: 'cuid_recipient123',
  })
  recipientId!: string;

  @ApiProperty({
    description: 'The message content',
    example: 'Hello, how are you?',
    minLength: 1,
    maxLength: 5000,
  })
  content!: string;
}

/**
 * Request DTO for sending a message to an existing conversation
 * @see SendMessageToConversationSchema in chat.dto.ts
 */
export class SendMessageToConversationRequestDto {
  @ApiProperty({
    description: 'The message content',
    example: 'Hello, how are you?',
    minLength: 1,
    maxLength: 5000,
  })
  content!: string;
}

/**
 * Request DTO for marking a conversation as read
 * This is an empty body as conversationId comes from the URL param
 */
export class MarkConversationAsReadRequestDto {
  // Empty body - conversationId is in URL path
  // This DTO exists to satisfy SDK generation requirement
}

/**
 * Request DTO for blocking a user
 * @see BlockUserSchema in chat.dto.ts
 */
export class BlockUserRequestDto {
  @ApiProperty({
    description: 'The ID of the user to block',
    example: 'cuid_user123',
  })
  userId!: string;

  @ApiPropertyOptional({
    description: 'Optional reason for blocking',
    example: 'Inappropriate behavior',
    maxLength: 500,
  })
  reason?: string;
}

// ============================================================================
// RESUME ANALYTICS REQUEST DTOs
// ============================================================================

/**
 * Request DTO for creating an analytics snapshot
 * This can include optional metadata for the snapshot
 */
export class CreateSnapshotRequestDto {
  @ApiPropertyOptional({
    description: 'Optional label for the snapshot',
    example: 'Before job application',
  })
  label?: string;

  @ApiPropertyOptional({
    description: 'Optional notes about the snapshot',
    example: 'Saving state before applying to Google',
  })
  notes?: string;
}

// ============================================================================
// TRANSLATION REQUEST DTOs
// ============================================================================

/**
 * Request DTO for simple text translation (pt-to-en or en-to-pt)
 */
export class TranslateSimpleRequestDto {
  @ApiProperty({
    description: 'The text to translate',
    example: 'Olá mundo',
    minLength: 1,
  })
  text!: string;
}

// ============================================================================
// RESUME IMPORT REQUEST DTOs
// ============================================================================

/**
 * Request DTO for retrying a failed import
 * This is an empty body as importId comes from the URL param
 */
export class RetryImportRequestDto {
  @ApiPropertyOptional({
    description: 'Optional flag to force retry even if not failed',
    example: false,
    default: false,
  })
  force?: boolean;
}

// ============================================================================
// GITHUB INTEGRATION REQUEST DTOs
// ============================================================================

/**
 * Request DTO for auto-syncing GitHub data from resume
 * This is an empty body as resumeId comes from the URL param
 */
export class AutoSyncGitHubRequestDto {
  @ApiPropertyOptional({
    description: 'Force sync even if recently synced',
    example: false,
    default: false,
  })
  force?: boolean;
}

// ============================================================================
// MEC SYNC REQUEST DTOs
// ============================================================================

/**
 * Request DTO for triggering MEC sync
 */
export class TriggerMecSyncRequestDto {
  @ApiPropertyOptional({
    description: 'Force full sync instead of incremental',
    example: false,
    default: false,
  })
  fullSync?: boolean;

  @ApiPropertyOptional({
    description: 'Sync source identifier',
    example: 'scheduled',
    default: 'api',
  })
  source?: string;
}

// ============================================================================
// THEME APPROVAL REQUEST DTOs
// ============================================================================

/**
 * Request DTO for submitting a theme for approval
 * This is an empty body as themeId comes from the URL param
 */
export class SubmitThemeRequestDto {
  @ApiPropertyOptional({
    description: 'Optional message for reviewers',
    example: 'Please review my custom theme',
    maxLength: 500,
  })
  message?: string;
}

// ============================================================================
// ONBOARDING REQUEST DTOs
// Uses generic sections format matching OnboardingDataSchema
// ============================================================================

/**
 * Personal info section for onboarding
 */
export class OnboardingPersonalInfoDto {
  @ApiProperty({ example: 'John Doe' })
  fullName!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;
}

/**
 * Professional profile section for onboarding
 */
export class OnboardingProfessionalProfileDto {
  @ApiPropertyOptional({ example: 'Software Engineer' })
  title?: string;

  @ApiPropertyOptional({ example: 'Experienced developer...' })
  summary?: string;
}

/**
 * Template selection for onboarding
 */
export class OnboardingTemplateSelectionDto {
  @ApiPropertyOptional({ example: 'modern' })
  templateId?: string;

  @ApiPropertyOptional({ example: 'blue' })
  colorScheme?: string;
}

/**
 * Generic section item for onboarding - content varies by section type
 */
export class OnboardingSectionItemDto {
  @ApiPropertyOptional({ example: 'item_123', description: 'Optional item ID' })
  id?: string;

  @ApiProperty({
    type: Object,
    description: 'Item content - structure depends on section type',
    example: {
      title: 'Software Engineer',
      company: 'Google',
      startDate: '2020-01',
    },
  })
  content!: Record<string, unknown>;
}

/**
 * Generic section for onboarding
 */
export class OnboardingSectionDto {
  @ApiProperty({
    example: 'section_type_v1',
    description: 'Section type key from SectionType',
  })
  sectionTypeKey!: string;

  @ApiPropertyOptional({
    type: [OnboardingSectionItemDto],
    description: 'Section items',
  })
  items?: OnboardingSectionItemDto[];

  @ApiPropertyOptional({
    example: false,
    description: 'User has no data for this section',
  })
  noData?: boolean;
}

/**
 * Request DTO for completing onboarding using generic sections format
 * @see OnboardingDataSchema in shared-kernel
 */
export class CompleteOnboardingRequestDto {
  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  username!: string;

  @ApiProperty({ type: OnboardingPersonalInfoDto })
  personalInfo!: OnboardingPersonalInfoDto;

  @ApiProperty({ type: OnboardingProfessionalProfileDto })
  professionalProfile!: OnboardingProfessionalProfileDto;

  @ApiProperty({ type: OnboardingTemplateSelectionDto })
  templateSelection!: OnboardingTemplateSelectionDto;

  @ApiPropertyOptional({
    type: [OnboardingSectionDto],
    description: 'Generic sections array',
  })
  sections?: OnboardingSectionDto[];
}

// ============================================================================
// USER CONSENT REQUEST DTOs
// ============================================================================

/**
 * Request DTO for accepting user consent
 * @see AcceptConsentSchema in shared-kernel
 */
export class AcceptConsentRequestDto {
  @ApiProperty({
    description: 'Type of document being accepted',
    enum: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT'],
    example: 'TERMS_OF_SERVICE',
  })
  documentType!: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING_CONSENT';

  @ApiPropertyOptional({
    description: 'Client IP address (auto-detected if not provided)',
    example: '192.168.1.1',
  })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client user agent (auto-detected if not provided)',
    example: 'Mozilla/5.0...',
  })
  userAgent?: string;
}

// ============================================================================
// ATS VALIDATION REQUEST DTOs
// ============================================================================

/**
 * Request DTO for ATS CV validation options
 * Used alongside file upload
 */
export class ValidateCVOptionsRequestDto {
  @ApiPropertyOptional({
    description: 'Check document format',
    example: true,
    default: true,
  })
  checkFormat?: boolean;

  @ApiPropertyOptional({
    description: 'Check CV sections',
    example: true,
    default: true,
  })
  checkSections?: boolean;

  @ApiPropertyOptional({
    description: 'Check grammar and spelling',
    example: false,
    default: false,
  })
  checkGrammar?: boolean;

  @ApiPropertyOptional({
    description: 'Check section order',
    example: true,
    default: true,
  })
  checkOrder?: boolean;

  @ApiPropertyOptional({
    description: 'Check layout safety',
    example: true,
    default: true,
  })
  checkLayout?: boolean;

  @ApiPropertyOptional({
    description: 'Resume ID for semantic snapshot lookup',
    example: 'cuid_resume123',
  })
  resumeId?: string;

  @ApiPropertyOptional({
    description: 'Run semantic ATS policies',
    example: true,
    default: true,
  })
  checkSemantic?: boolean;
}

// ============================================================================
// UPLOAD REQUEST DTOs
// ============================================================================

/**
 * Request DTO for profile image upload
 * multipart/form-data
 */
export class UploadProfileImageRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The profile image file to upload (JPEG, PNG, WebP)',
  })
  file!: unknown;
}

/**
 * Request DTO for company logo upload
 * multipart/form-data
 */
export class UploadCompanyLogoRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The company logo file to upload (JPEG, PNG, WebP, SVG)',
  })
  file!: unknown;
}

/**
 * Request DTO for ATS CV validation
 * multipart/form-data with file and validation options
 */
export class ValidateCVRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CV file (PDF or DOCX)',
  })
  file!: unknown;

  @ApiPropertyOptional({
    description: 'Check document format (default: true)',
    example: true,
    default: true,
  })
  checkFormat?: boolean;

  @ApiPropertyOptional({
    description: 'Check CV sections (default: true)',
    example: true,
    default: true,
  })
  checkSections?: boolean;

  @ApiPropertyOptional({
    description: 'Check grammar and spelling (default: false)',
    example: false,
    default: false,
  })
  checkGrammar?: boolean;

  @ApiPropertyOptional({
    description: 'Check section order (default: true)',
    example: true,
    default: true,
  })
  checkOrder?: boolean;

  @ApiPropertyOptional({
    description: 'Check layout safety (default: true)',
    example: true,
    default: true,
  })
  checkLayout?: boolean;

  @ApiPropertyOptional({
    description: 'Optional resume ID for semantic snapshot lookup',
    example: 'cuid_resume123',
  })
  resumeId?: string;

  @ApiPropertyOptional({
    description: 'Run semantic ATS policies (default: true)',
    example: true,
    default: true,
  })
  checkSemantic?: boolean;
}
