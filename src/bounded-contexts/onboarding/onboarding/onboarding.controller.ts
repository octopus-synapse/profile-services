/**
 * Onboarding Controller — Session / Commands API
 *
 * Backend drives the entire onboarding flow.
 * Frontend is a pure renderer — sends commands, receives session state.
 *
 * Endpoints:
 *   GET  /session           → Full session state (steps, fields, data, navigation)
 *   POST /session/next      → Advance to next step (with optional step data)
 *   POST /session/previous  → Go back one step
 *   POST /session/goto      → Jump to accessible step
 *   POST /session/save      → Save current step data without advancing
 *   POST /session/complete  → Complete onboarding (backend builds payload from progress)
 *
 * Legacy endpoints kept for backward compat:
 *   GET  /progress           → Alias for GET /session
 *   PUT  /progress           → Raw partial save
 *   POST /                   → Complete with explicit payload
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import {
  type OnboardingData,
  OnboardingDataSchema,
  OnboardingProgressSchema,
} from '@/shared-kernel';
import {
  CompleteOnboardingRequestDto,
  OnboardingPersonalInfoDto,
  OnboardingProfessionalProfileDto,
  OnboardingTemplateSelectionDto,
} from '@/shared-kernel/dtos/sdk-request.dto';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver';
import {
  buildOnboardingSteps,
  calculateProgress,
  getStepIndex,
  type SectionTypeData,
  StepMetaDto,
} from './config/onboarding-steps.config';
import { canProceedFromStep } from './config/onboarding-validation';
import { OnboardingService } from './onboarding.service';
import type { OnboardingProgressData } from './services/onboarding-progress/ports/onboarding-progress.port';

// ============================================================================
// Response DTOs
// ============================================================================

class SectionItemDto {
  @ApiPropertyOptional({ example: 'item-123' })
  id?: string;

  @ApiPropertyOptional({ type: Object })
  content?: Record<string, unknown>;
}

class SectionProgressDto {
  @ApiProperty({ example: 'work_experience_v1' })
  sectionTypeKey!: string;

  @ApiPropertyOptional({ type: [SectionItemDto] })
  items?: SectionItemDto[];

  @ApiPropertyOptional({ example: false })
  noData?: boolean;
}

/** Session response — everything the frontend needs to render */
export class OnboardingSessionDto {
  // Navigation (computed server-side)
  @ApiProperty({ example: 'personal-info' })
  currentStep!: string;

  @ApiProperty({ example: ['welcome'] })
  completedSteps!: string[];

  @ApiProperty({ example: 25, description: 'Progress percentage 0-100' })
  progress!: number;

  @ApiProperty({ example: true, description: 'Can proceed to next step' })
  canProceed!: boolean;

  @ApiPropertyOptional({
    example: 'username',
    description: 'Next step ID or null',
  })
  nextStep?: string | null;

  @ApiPropertyOptional({
    example: 'welcome',
    description: 'Previous step ID or null',
  })
  previousStep?: string | null;

  // Step metadata with field definitions (server-driven rendering)
  @ApiProperty({
    type: [StepMetaDto],
    description: 'All onboarding steps with field defs',
  })
  steps!: StepMetaDto[];

  // Data (typed objects)
  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ type: OnboardingPersonalInfoDto })
  personalInfo?: OnboardingPersonalInfoDto;

  @ApiPropertyOptional({ type: OnboardingProfessionalProfileDto })
  professionalProfile?: OnboardingProfessionalProfileDto;

  @ApiPropertyOptional({ type: [SectionProgressDto] })
  sections?: SectionProgressDto[];

  @ApiPropertyOptional({ type: OnboardingTemplateSelectionDto })
  templateSelection?: OnboardingTemplateSelectionDto;
}

// Keep backward compat alias
export { OnboardingSessionDto as OnboardingProgressDto };

class CompleteOnboardingResponseDto {
  @ApiProperty({ example: 'cuid123' })
  resumeId!: string;
}

class SaveProgressResponseDto {
  @ApiProperty({ example: 'professional-profile' })
  currentStep!: string;

  @ApiProperty({ example: ['welcome', 'personal-info'] })
  completedSteps!: string[];
}

// ============================================================================
// Command Request DTOs
// ============================================================================

class NextStepRequestDto {
  @ApiPropertyOptional({
    type: Object,
    description: 'Data to save for the current step',
  })
  stepData?: Record<string, unknown>;
}

class GotoStepRequestDto {
  @ApiProperty({
    example: 'personal-info',
    description: 'Step ID to navigate to',
  })
  stepId!: string;
}

class SaveStepDataRequestDto {
  @ApiProperty({
    type: Object,
    description: 'Data to save for the current step',
  })
  stepData!: Record<string, unknown>;
}

// Legacy request DTOs (backward compat)

class SectionProgressInputDto {
  @ApiProperty({ example: 'work_experience_v1' })
  sectionTypeKey!: string;

  @ApiPropertyOptional({ type: [SectionItemDto] })
  items?: SectionItemDto[];

  @ApiPropertyOptional({ example: false })
  noData?: boolean;
}

class SaveProgressRequestDto {
  @ApiProperty({ example: 'professional-profile' })
  currentStep!: string;

  @ApiProperty({ example: ['welcome', 'personal-info'] })
  completedSteps!: string[];

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ type: OnboardingPersonalInfoDto })
  personalInfo?: OnboardingPersonalInfoDto;

  @ApiPropertyOptional({ type: OnboardingProfessionalProfileDto })
  professionalProfile?: OnboardingProfessionalProfileDto;

  @ApiPropertyOptional({ type: [SectionProgressInputDto] })
  sections?: SectionProgressInputDto[];

  @ApiPropertyOptional({ type: OnboardingTemplateSelectionDto })
  templateSelection?: OnboardingTemplateSelectionDto;
}

// ============================================================================
// Controller
// ============================================================================

@SdkExport({ tag: 'onboarding', description: 'Onboarding API' })
@ApiTags('onboarding')
@ApiBearerAuth('JWT-auth')
@Controller('v1/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // ==========================================================================
  // Session / Commands API
  // ==========================================================================

  @Get('session')
  @ApiOperation({
    summary: 'Get onboarding session with field definitions and navigation',
  })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
    example: 'pt-BR',
  })
  @ApiDataResponse(OnboardingSessionDto, {
    description: 'Full session state — steps, fields, data, navigation',
  })
  async getSession(
    @CurrentUser() user: UserPayload,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    const [data, sectionTypes] = await Promise.all([
      this.onboardingService.getProgress(user.userId),
      this.onboardingService.getSectionTypeDefinitions(locale),
    ]);
    return { success: true, data: this.buildSession(data, sectionTypes) };
  }

  @Post('session/next')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save current step data and advance to next step' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiBody({ type: NextStepRequestDto })
  @ApiDataResponse(OnboardingSessionDto, { description: 'Updated session' })
  async nextStep(
    @CurrentUser() user: UserPayload,
    @Body() body: Record<string, unknown>,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    // Body IS the step data - no fallback, no transformation
    const stepData = body;

    const rawData = await this.onboardingService.executeNext(user.userId, stepData);
    const sectionTypes = await this.onboardingService.getSectionTypeDefinitions(locale);
    return { success: true, data: this.buildSession(rawData, sectionTypes) };
  }

  @Post('session/previous')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Go back to previous step' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiBody({ required: false, description: 'No body required - uses authenticated user' })
  @ApiDataResponse(OnboardingSessionDto, { description: 'Updated session' })
  async previousStep(
    @CurrentUser() user: UserPayload,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    const rawData = await this.onboardingService.executePrevious(user.userId);
    const sectionTypes = await this.onboardingService.getSectionTypeDefinitions(locale);
    return { success: true, data: this.buildSession(rawData, sectionTypes) };
  }

  @Post('session/goto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Jump to an accessible step' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiBody({ type: GotoStepRequestDto })
  @ApiDataResponse(OnboardingSessionDto, { description: 'Updated session' })
  async gotoStep(
    @CurrentUser() user: UserPayload,
    @Body() body: GotoStepRequestDto,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    const rawData = await this.onboardingService.executeGoto(user.userId, body.stepId);
    const sectionTypes = await this.onboardingService.getSectionTypeDefinitions(locale);
    return { success: true, data: this.buildSession(rawData, sectionTypes) };
  }

  @Post('session/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save current step data without advancing' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiBody({ type: SaveStepDataRequestDto })
  @ApiDataResponse(OnboardingSessionDto, { description: 'Updated session' })
  async saveStepData(
    @CurrentUser() user: UserPayload,
    @Body() body: Record<string, unknown>,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    // Body IS the step data - no fallback
    const stepData = body;
    const rawData = await this.onboardingService.executeSave(user.userId, stepData);
    const sectionTypes = await this.onboardingService.getSectionTypeDefinitions(locale);
    return { success: true, data: this.buildSession(rawData, sectionTypes) };
  }

  @Post('session/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete onboarding — backend builds payload from saved progress',
  })
  @ApiBody({ required: false, description: 'No body required - uses saved session progress' })
  @ApiDataResponse(CompleteOnboardingResponseDto, {
    description: 'Onboarding completed, resume created',
  })
  async completeFromSession(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<CompleteOnboardingResponseDto>> {
    const result = await this.onboardingService.completeFromProgress(user.userId);
    return { success: true, data: result as CompleteOnboardingResponseDto };
  }

  // ==========================================================================
  // Legacy Endpoints (backward compat — will be deprecated)
  // ==========================================================================

  @Get('progress')
  @ApiOperation({ summary: '[Legacy] Get onboarding progress' })
  @ApiDataResponse(OnboardingSessionDto, {
    description: 'Enriched progress data',
  })
  async getProgress(@CurrentUser() user: UserPayload): Promise<DataResponse<OnboardingSessionDto>> {
    const [data, sectionTypes] = await Promise.all([
      this.onboardingService.getProgress(user.userId),
      this.onboardingService.getSectionTypeDefinitions(),
    ]);
    return { success: true, data: this.buildSession(data, sectionTypes) };
  }

  @Put('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Legacy] Save onboarding progress' })
  @ApiBody({ type: SaveProgressRequestDto })
  @ApiDataResponse(SaveProgressResponseDto, { description: 'Progress saved' })
  async saveProgress(
    @CurrentUser() user: UserPayload,
    @Body(createZodPipe(OnboardingProgressSchema)) data: unknown,
  ): Promise<DataResponse<SaveProgressResponseDto>> {
    const result = await this.onboardingService.saveProgress(user.userId, data as never);
    return { success: true, data: result as SaveProgressResponseDto };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Legacy] Complete onboarding with explicit payload',
  })
  @ApiBody({ type: CompleteOnboardingRequestDto })
  @ApiDataResponse(CompleteOnboardingResponseDto, {
    description: 'Onboarding completed',
  })
  async completeOnboarding(
    @CurrentUser() user: UserPayload,
    @Body(createZodPipe(OnboardingDataSchema)) data: OnboardingData,
  ): Promise<DataResponse<CompleteOnboardingResponseDto>> {
    const result = await this.onboardingService.completeOnboarding(user.userId, data);
    return { success: true, data: result as CompleteOnboardingResponseDto };
  }

  // ============================================================================
  // Private: Build session response
  // ============================================================================

  buildSession(
    data: OnboardingProgressData,
    sectionTypes: SectionTypeData[],
  ): OnboardingSessionDto {
    const steps = buildOnboardingSteps(sectionTypes);
    const currentStepIndex = getStepIndex(data.currentStep, steps);
    const totalSteps = steps.length;

    const personalInfo = this.toPersonalInfo(data.personalInfo);
    const professionalProfile = this.toProfessionalProfile(data.professionalProfile);
    const templateSelection = this.toTemplateSelection(data.templateSelection);

    const canProceed = canProceedFromStep(data.currentStep, {
      username: data.username,
      personalInfo,
      professionalProfile,
      templateSelection,
    });

    const nextStep = currentStepIndex < totalSteps - 1 ? steps[currentStepIndex + 1]?.id : null;
    const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1]?.id : null;

    return {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      progress: calculateProgress(currentStepIndex, totalSteps),
      canProceed,
      nextStep,
      previousStep,
      steps,
      username: data.username ?? undefined,
      personalInfo,
      professionalProfile,
      sections: data.sections?.map((s) => ({
        sectionTypeKey: s.sectionTypeKey,
        items: s.items?.map((item) => this.toItem(item)),
        noData: s.noData,
      })),
      templateSelection,
    };
  }

  private toItem(item: unknown): SectionItemDto {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        id: typeof obj.id === 'string' ? obj.id : undefined,
        content:
          typeof obj.content === 'object' ? (obj.content as Record<string, unknown>) : undefined,
      };
    }
    return {};
  }

  private toPersonalInfo(value: unknown): OnboardingPersonalInfoDto | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    if (typeof obj.fullName !== 'string' || typeof obj.email !== 'string') return undefined;
    return {
      fullName: obj.fullName,
      email: obj.email,
      phone: typeof obj.phone === 'string' ? obj.phone : undefined,
      location: typeof obj.location === 'string' ? obj.location : undefined,
    };
  }

  private toProfessionalProfile(value: unknown): OnboardingProfessionalProfileDto | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    return {
      jobTitle: typeof obj.jobTitle === 'string' ? obj.jobTitle : '',
      summary: typeof obj.summary === 'string' ? obj.summary : undefined,
      linkedin: typeof obj.linkedin === 'string' ? obj.linkedin : undefined,
      github: typeof obj.github === 'string' ? obj.github : undefined,
      website: typeof obj.website === 'string' ? obj.website : undefined,
    };
  }

  private toTemplateSelection(value: unknown): OnboardingTemplateSelectionDto | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    return {
      templateId: typeof obj.templateId === 'string' ? obj.templateId : undefined,
      colorScheme: typeof obj.colorScheme === 'string' ? obj.colorScheme : undefined,
    };
  }
}
