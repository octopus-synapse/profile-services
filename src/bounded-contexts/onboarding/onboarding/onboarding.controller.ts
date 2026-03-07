import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import type { OnboardingProgress } from '@/shared-kernel';
import { type OnboardingData, OnboardingDataSchema } from '@/shared-kernel';
import { CompleteOnboardingRequestDto } from '@/shared-kernel/dtos/sdk-request.dto';
import { OnboardingProgressResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { OnboardingService } from './onboarding.service';
import type {
  OnboardingProgressData,
  SectionProgressData,
} from './services/onboarding-progress/ports/onboarding-progress.port';

/** DTO for complete onboarding response */
export class CompleteOnboardingResponseDto {
  @ApiProperty({ example: 'cuid123' })
  resumeId!: string;
}

/** DTO for save progress response */
export class SaveProgressResponseDto {
  @ApiProperty({ example: 'professional-profile' })
  currentStep!: string;

  @ApiProperty({ example: ['welcome', 'personal-info'] })
  completedSteps!: string[];
}

/** DTO for a section's progress data */
export class SectionProgressDto {
  @ApiProperty({
    example: 'section_type_v1',
    description: 'Section type key from SectionType',
  })
  sectionTypeKey!: string;

  @ApiPropertyOptional({
    type: [Object],
    description: 'Section items (content varies by section type)',
  })
  items?: Record<string, unknown>[];

  @ApiPropertyOptional({
    example: false,
    description: 'User has no data for this section',
  })
  noData?: boolean;
}

/** DTO for onboarding progress using generic sections */
export class OnboardingProgressDto {
  @ApiProperty({ example: 'professional-profile' })
  currentStep!: string;

  @ApiProperty({ example: ['welcome', 'personal-info'] })
  completedSteps!: string[];

  @ApiPropertyOptional()
  personalInfo?: { fullName: string; email: string };

  @ApiPropertyOptional({ type: Object })
  professionalProfile?: Record<string, string | number | boolean>;

  @ApiPropertyOptional({
    type: [SectionProgressDto],
    description: 'Generic sections progress',
  })
  sections?: SectionProgressDto[];

  @ApiPropertyOptional({ type: Object })
  templateSelection?: Record<string, string | number | boolean>;
}

@SdkExport({ tag: 'onboarding', description: 'Onboarding API' })
@ApiTags('onboarding')
@ApiBearerAuth('JWT-auth')
@Controller('v1/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete user onboarding with resume data' })
  @ApiBody({ type: CompleteOnboardingRequestDto })
  @ApiDataResponse(CompleteOnboardingResponseDto, {
    description: 'Onboarding completed successfully',
  })
  async completeOnboarding(
    @CurrentUser() user: UserPayload,
    @Body(createZodPipe(OnboardingDataSchema)) data: OnboardingData,
  ): Promise<DataResponse<CompleteOnboardingResponseDto>> {
    const result = await this.onboardingService.completeOnboarding(user.userId, data);
    return { success: true, data: result as CompleteOnboardingResponseDto };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get user onboarding status' })
  @ApiDataResponse(OnboardingProgressResponseDto, {
    description: 'Onboarding status retrieved successfully',
  })
  async getStatus(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<OnboardingProgressResponseDto>> {
    const result = await this.onboardingService.getOnboardingStatus(user.userId);
    return {
      success: true,
      data: {
        userId: user.userId,
        currentStep: result.hasCompletedOnboarding ? 1 : 0,
        totalSteps: 1,
        progressPercentage: result.hasCompletedOnboarding ? 100 : 0,
        completed: result.hasCompletedOnboarding,
        steps: [
          {
            stepId: 'ONBOARDING',
            title: 'Onboarding',
            completed: result.hasCompletedOnboarding,
            completedAt: result.onboardingCompletedAt
              ? result.onboardingCompletedAt.toISOString()
              : undefined,
          },
        ],
      },
    };
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get user onboarding progress (checkpoint)' })
  @ApiDataResponse(OnboardingProgressDto, {
    description: 'Onboarding progress retrieved successfully',
  })
  async getProgress(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<OnboardingProgressDto>> {
    const result = await this.onboardingService.getProgress(user.userId);
    return { success: true, data: this.toOnboardingProgressDto(result) };
  }

  @Put('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save user onboarding progress (checkpoint)' })
  @ApiDataResponse(SaveProgressResponseDto, {
    description: 'Onboarding progress saved successfully',
  })
  async saveProgress(
    @CurrentUser() user: UserPayload,
    @Body() data: OnboardingProgress,
  ): Promise<DataResponse<SaveProgressResponseDto>> {
    const result = await this.onboardingService.saveProgress(user.userId, data);
    return { success: true, data: result as SaveProgressResponseDto };
  }

  private toOnboardingProgressDto(result: OnboardingProgressData): OnboardingProgressDto {
    return {
      currentStep: result.currentStep,
      completedSteps: result.completedSteps,
      personalInfo: this.toPersonalInfo(result.personalInfo),
      professionalProfile: this.toOptionalRecord(result.professionalProfile),
      sections: result.sections?.map((section) => this.toSectionProgressDto(section)),
      templateSelection: this.toOptionalRecord(result.templateSelection),
    };
  }

  private toSectionProgressDto(section: SectionProgressData): SectionProgressDto {
    return {
      sectionTypeKey: section.sectionTypeKey,
      items: section.items?.map((item) => this.toRecordUnknown(item)),
      noData: section.noData,
    };
  }

  private toRecordUnknown(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private toOptionalRecord(value: unknown): Record<string, string | number | boolean> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    const entries = Object.entries(value).filter(([, item]) => {
      return typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean';
    });

    return Object.fromEntries(entries);
  }

  private toPersonalInfo(value: unknown): { fullName: string; email: string } | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    const fullName = Reflect.get(value, 'fullName');
    const email = Reflect.get(value, 'email');

    if (typeof fullName === 'string' && typeof email === 'string') {
      return { fullName, email };
    }

    return undefined;
  }
}
