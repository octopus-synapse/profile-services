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
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CacheLockService } from '@/bounded-contexts/platform/common/cache/cache-lock.service';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver';
import type { OnboardingThemeOption } from '../../domain/config/onboarding-steps.config';
import { ONBOARDING_USE_CASES, type OnboardingUseCases } from '../../domain/ports/onboarding.port';
import { OnboardingConfigPort } from '../../domain/ports/onboarding-config.port';
import {
  ONBOARDING_PROGRESS_USE_CASES,
  type OnboardingProgressUseCases,
} from '../../domain/ports/onboarding-progress.port';
import { SectionTypeDefinitionPort } from '../../domain/ports/section-type-definition.port';
import { SystemThemesPort } from '../../domain/ports/system-themes.port';
import {
  type OnboardingData,
  OnboardingDataSchema,
} from '../../domain/schemas/onboarding-data.schema';
import {
  type OnboardingProgress,
  OnboardingProgressSchema,
} from '../../domain/schemas/onboarding-progress.schema';
import {
  CompleteOnboardingRequestDto,
  CompleteOnboardingResponseDto,
  GotoStepRequestDto,
  OnboardingSessionDto,
  OnboardingStatusResponseDto,
  SaveProgressRequestDto,
  SaveProgressResponseDto,
} from '../dto';
import { buildSession } from '../presenters/onboarding.presenter';

const ONBOARDING_STEP_DATA_REQUEST_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  description: 'Data to save for the current step',
} as const;

// ============================================================================
// Controller
// ============================================================================

@SdkExport({ tag: 'onboarding', description: 'Onboarding API' })
@ApiTags('onboarding')
@ApiBearerAuth('JWT-auth')
@Controller('v1/onboarding')
export class OnboardingController {
  constructor(
    @Inject(ONBOARDING_USE_CASES)
    private readonly useCases: OnboardingUseCases,
    @Inject(ONBOARDING_PROGRESS_USE_CASES)
    private readonly progressUseCases: OnboardingProgressUseCases,
    private readonly systemThemes: SystemThemesPort,
    private readonly onboardingConfig: OnboardingConfigPort,
    private readonly eventEmitter: EventEmitter2,
    private readonly sectionTypeDefs: SectionTypeDefinitionPort,
    private readonly cacheLock: CacheLockService,
  ) {}

  private async getSystemThemes(): Promise<OnboardingThemeOption[]> {
    return this.systemThemes.getSystemThemes();
  }

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
    const [data, stepConfigs, strengthConfig, systemThemes, sectionTypes] = await Promise.all([
      this.progressUseCases.getProgressUseCase.execute(user.userId),
      this.onboardingConfig.getActiveSteps(),
      this.onboardingConfig.getStrengthConfig(),
      this.getSystemThemes(),
      this.sectionTypeDefs.findAll(locale),
    ]);
    return {
      success: true,
      data: buildSession(
        data,
        stepConfigs,
        strengthConfig,
        locale,
        systemThemes,
        {
          name: user.name,
          email: user.email,
        },
        sectionTypes,
      ),
    };
  }

  @Post('session/next')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save current step data and advance to next step' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiBody({ schema: ONBOARDING_STEP_DATA_REQUEST_SCHEMA })
  @ApiDataResponse(OnboardingSessionDto, { description: 'Updated session' })
  async nextStep(
    @CurrentUser() user: UserPayload,
    @Body() body: Record<string, unknown>,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    const stepData = body;

    const rawData = await this.useCases.advanceOnboardingStepUseCase.execute(user.userId, stepData);
    const [stepConfigs, strengthConfig, systemThemes] = await Promise.all([
      this.onboardingConfig.getActiveSteps(),
      this.onboardingConfig.getStrengthConfig(),
      this.getSystemThemes(),
    ]);
    return {
      success: true,
      data: buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes),
    };
  }

  @Post('session/previous')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Go back to previous step' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiDataResponse(OnboardingSessionDto, { description: 'Updated session' })
  async previousStep(
    @CurrentUser() user: UserPayload,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    const rawData = await this.useCases.goBackOnboardingStepUseCase.execute(user.userId);
    const [stepConfigs, strengthConfig, systemThemes] = await Promise.all([
      this.onboardingConfig.getActiveSteps(),
      this.onboardingConfig.getStrengthConfig(),
      this.getSystemThemes(),
    ]);
    return {
      success: true,
      data: buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes),
    };
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
    const rawData = await this.useCases.gotoOnboardingStepUseCase.execute(user.userId, body.stepId);
    const [stepConfigs, strengthConfig, systemThemes] = await Promise.all([
      this.onboardingConfig.getActiveSteps(),
      this.onboardingConfig.getStrengthConfig(),
      this.getSystemThemes(),
    ]);
    return {
      success: true,
      data: buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes),
    };
  }

  @Post('session/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save current step data without advancing' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiBody({ schema: ONBOARDING_STEP_DATA_REQUEST_SCHEMA })
  @ApiDataResponse(OnboardingSessionDto, { description: 'Updated session' })
  async saveStepData(
    @CurrentUser() user: UserPayload,
    @Body() body: Record<string, unknown>,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    const stepData = body;
    const rawData = await this.useCases.saveOnboardingStepDataUseCase.execute(
      user.userId,
      stepData,
    );

    this.eventEmitter.emit('onboarding.data.changed', { userId: user.userId });

    const [stepConfigs, strengthConfig, systemThemes] = await Promise.all([
      this.onboardingConfig.getActiveSteps(),
      this.onboardingConfig.getStrengthConfig(),
      this.getSystemThemes(),
    ]);
    return {
      success: true,
      data: buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes),
    };
  }

  @Post('session/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete onboarding — backend builds payload from saved progress',
  })
  @ApiDataResponse(CompleteOnboardingResponseDto, {
    description: 'Onboarding completed, resume created',
  })
  async completeFromSession(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<CompleteOnboardingResponseDto>> {
    const lockKey = `onboarding:complete:${user.userId}`;
    const acquired = await this.cacheLock.acquireLock(lockKey, 60);
    if (!acquired) {
      throw new ConflictException('Onboarding completion already in progress');
    }
    try {
      const result = await this.useCases.completeOnboardingFromProgressUseCase.execute(user.userId);
      this.eventEmitter.emit('auth.session.invalidate', { userId: user.userId });
      return {
        success: true,
        data: result as CompleteOnboardingResponseDto,
        resumeId: result.resumeId,
      } as DataResponse<CompleteOnboardingResponseDto> & { resumeId: string };
    } finally {
      await this.cacheLock.releaseLock(lockKey);
    }
  }

  @Post('session/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart onboarding with existing profile data' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiDataResponse(OnboardingSessionDto, {
    description: 'New session pre-populated with existing data',
  })
  async restartOnboarding(
    @CurrentUser() user: UserPayload,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<OnboardingSessionDto>> {
    const locale = parseLocale(localeParam);
    const stepConfigs = await this.onboardingConfig.getActiveSteps();

    await this.useCases.restartOnboardingUseCase.execute(user.userId, stepConfigs);

    // Invalidate session cache so frontend picks up hasCompletedOnboarding = false
    this.eventEmitter.emit('auth.session.invalidate', { userId: user.userId });

    return this.getSession(user, locale);
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
    const [data, stepConfigs, strengthConfig] = await Promise.all([
      this.progressUseCases.getProgressUseCase.execute(user.userId),
      this.onboardingConfig.getActiveSteps(),
      this.onboardingConfig.getStrengthConfig(),
    ]);
    return { success: true, data: buildSession(data, stepConfigs, strengthConfig) };
  }

  @Get('status')
  @ApiOperation({ summary: '[Legacy] Get onboarding completion status' })
  @ApiDataResponse(OnboardingStatusResponseDto, {
    description: 'Onboarding completion status',
  })
  async getStatus(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<OnboardingStatusResponseDto>> {
    const status = await this.useCases.getOnboardingStatusUseCase.execute(user.userId);
    return {
      success: true,
      data: status,
      ...status,
    } as DataResponse<OnboardingStatusResponseDto> & OnboardingStatusResponseDto;
  }

  @Put('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Legacy] Save onboarding progress' })
  @ApiBody({ type: SaveProgressRequestDto })
  @ApiDataResponse(SaveProgressResponseDto, { description: 'Progress saved' })
  async saveProgress(
    @CurrentUser() user: UserPayload,
    @Body(createZodPipe(OnboardingProgressSchema)) data: OnboardingProgress,
  ): Promise<DataResponse<SaveProgressResponseDto>> {
    const result = await this.progressUseCases.saveProgressUseCase.execute(user.userId, data);
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
    const lockKey = `onboarding:complete:${user.userId}`;
    const acquired = await this.cacheLock.acquireLock(lockKey, 60);
    if (!acquired) {
      throw new ConflictException('Onboarding completion already in progress');
    }
    try {
      const result = await this.useCases.completeOnboardingUseCase.execute(user.userId, data);
      this.eventEmitter.emit('auth.session.invalidate', { userId: user.userId });
      return {
        success: true,
        data: result as CompleteOnboardingResponseDto,
        resumeId: result.resumeId,
      } as DataResponse<CompleteOnboardingResponseDto> & { resumeId: string };
    } finally {
      await this.cacheLock.releaseLock(lockKey);
    }
  }
}
