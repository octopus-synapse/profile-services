import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { OnboardingProgressResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { OnboardingService } from './onboarding.service';

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

/** DTO for onboarding progress */
export class OnboardingProgressDto {
  @ApiProperty({ example: 'professional-profile' })
  currentStep!: string;

  @ApiProperty({ example: ['welcome', 'personal-info'] })
  completedSteps!: string[];

  @ApiPropertyOptional()
  personalInfo?: { fullName: string; email: string };

  @ApiPropertyOptional({ type: Object })
  professionalProfile?: Record<string, string | number | boolean>;

  @ApiProperty({ example: [], type: [Object] })
  experiences!: Record<string, string | number | boolean>[];

  @ApiProperty({ example: false })
  noExperience!: boolean;

  @ApiProperty({ example: [], type: [Object] })
  education!: Record<string, string | number | boolean>[];

  @ApiProperty({ example: false })
  noEducation!: boolean;

  @ApiProperty({ example: [], type: [String] })
  skills!: string[];

  @ApiProperty({ example: false })
  noSkills!: boolean;

  @ApiProperty({ example: [], type: [String] })
  languages!: string[];

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
      data: result as unknown as OnboardingProgressResponseDto,
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
    return { success: true, data: result as unknown as OnboardingProgressDto };
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
}
