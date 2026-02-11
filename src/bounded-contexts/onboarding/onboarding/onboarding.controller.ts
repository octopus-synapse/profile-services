import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import type { OnboardingProgress } from '@/shared-kernel';
import { type OnboardingData, OnboardingDataSchema } from '@/shared-kernel';
import { OnboardingProgressResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { OnboardingService } from './onboarding.service';

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
  @ApiResponse({
    status: 200,
    description: 'Onboarding completed successfully',
    schema: {
      example: {
        success: true,
        resumeId: 'cuid123',
        message: 'Onboarding completed successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async completeOnboarding(
    @CurrentUser() user: UserPayload,
    @Body(createZodPipe(OnboardingDataSchema)) data: OnboardingData,
  ) {
    return this.onboardingService.completeOnboarding(user.userId, data);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get user onboarding status' })
  @ApiResponse({ status: 200, type: OnboardingProgressResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Onboarding status retrieved successfully',
    schema: {
      example: {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: '2025-11-21T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getStatus(@CurrentUser() user: UserPayload) {
    return this.onboardingService.getOnboardingStatus(user.userId);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get user onboarding progress (checkpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding progress retrieved successfully',
    schema: {
      example: {
        currentStep: 'professional-profile',
        completedSteps: ['welcome', 'personal-info'],
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        professionalProfile: null,
        experiences: [],
        noExperience: false,
        education: [],
        noEducation: false,
        skills: [],
        noSkills: false,
        languages: [],
        templateSelection: null,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProgress(@CurrentUser() user: UserPayload) {
    return this.onboardingService.getProgress(user.userId);
  }

  @Put('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save user onboarding progress (checkpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding progress saved successfully',
    schema: {
      example: {
        success: true,
        currentStep: 'professional-profile',
        completedSteps: ['welcome', 'personal-info'],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async saveProgress(@CurrentUser() user: UserPayload, @Body() data: OnboardingProgress) {
    return this.onboardingService.saveProgress(user.userId, data);
  }
}
