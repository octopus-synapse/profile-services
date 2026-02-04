import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import type { OnboardingProgress } from '@octopus-synapse/profile-contracts';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import {
  OnboardingDataSchema,
  type OnboardingData,
} from '@octopus-synapse/profile-contracts';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';

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
  async saveProgress(
    @CurrentUser() user: UserPayload,
    @Body() data: OnboardingProgress,
  ) {
    return this.onboardingService.saveProgress(user.userId, data);
  }
}
