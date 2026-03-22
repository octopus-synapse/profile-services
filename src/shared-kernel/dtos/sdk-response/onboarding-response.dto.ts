/**
 * Onboarding & Consent SDK Response DTOs
 *
 * Response types for onboarding progress, consent records, and GDPR exports.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class ConsentRecordDto {
  @ApiProperty({ example: 'consent-123' })
  id!: string;

  @ApiProperty({ example: 'user-456' })
  userId!: string;

  @ApiProperty({
    example: 'TERMS_OF_SERVICE',
    enum: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT'],
  })
  documentType!: string;

  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: '2026-01-09T19:15:00.000Z' })
  acceptedAt!: string;

  @ApiProperty({ example: '192.168.1.1' })
  ipAddress!: string;

  @ApiProperty({ example: 'Mozilla/5.0...' })
  userAgent!: string;
}

export class AcceptConsentResponseDto {
  @ApiProperty({ example: 'Terms of Service accepted successfully' })
  message!: string;

  @ApiProperty({ type: ConsentRecordDto })
  consent!: ConsentRecordDto;
}

export class ConsentHistoryResponseDto {
  @ApiProperty({ example: 'consent-1' })
  id!: string;

  @ApiProperty({
    example: 'TERMS_OF_SERVICE',
    enum: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT'],
  })
  documentType!: string;

  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: '2026-01-09T10:00:00.000Z' })
  acceptedAt!: string;

  @ApiProperty({ example: '192.168.1.1' })
  ipAddress!: string;

  @ApiProperty({ example: 'Mozilla/5.0...' })
  userAgent!: string;
}

export class ConsentStatusResponseDto {
  @ApiProperty({ example: true })
  tosAccepted!: boolean;

  @ApiProperty({ example: true })
  privacyPolicyAccepted!: boolean;

  @ApiProperty({ example: false })
  marketingConsentAccepted!: boolean;

  @ApiProperty({ example: '1.0.0' })
  latestTosVersion!: string;

  @ApiProperty({ example: '1.0.0' })
  latestPrivacyPolicyVersion!: string;
}

export class GdprExportResponseDto {
  @ApiProperty({ example: 'https://example.com/download/export.zip' })
  downloadUrl!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  expiresAt!: string;
}
