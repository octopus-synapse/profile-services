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
  Inject,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import type { SectionDefinition } from '@/shared-kernel/schemas/sections';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver';
import type {
  OnboardingThemeOption,
  SectionTypeData,
} from '../../domain/config/onboarding-steps.config';
import { calculateStrength } from '../../domain/config/onboarding-strength';
import {
  canCompleteOnboarding,
  canProceedFromStep,
  validateStepFields,
} from '../../domain/config/onboarding-validation';
import { ONBOARDING_USE_CASES, type OnboardingUseCases } from '../../domain/ports/onboarding.port';
import {
  OnboardingConfigPort,
  type OnboardingStepConfig,
} from '../../domain/ports/onboarding-config.port';
import type { OnboardingProgressData } from '../../domain/ports/onboarding-progress.port';
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
  PersonalInfoDto,
  ProfessionalProfileDto,
  SaveProgressRequestDto,
  SaveProgressResponseDto,
  SectionItemDto,
  TemplateSelectionDto,
} from '../dto';

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
      data: this.buildSession(
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
      data: this.buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes),
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
      data: this.buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes),
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
      data: this.buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes),
    };
  }

  @Post('session/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate step fields without saving' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
  })
  @ApiBody({ schema: ONBOARDING_STEP_DATA_REQUEST_SCHEMA })
  async validateStep(
    @CurrentUser() user: UserPayload,
    @Body() body: { stepId?: string; data: Record<string, string> },
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<{ valid: boolean; errors: Record<string, string> }>> {
    const _locale = parseLocale(localeParam);

    // Get current progress to determine step
    const progress = await this.progressUseCases.getProgressUseCase.execute(user.userId);
    const stepId = body.stepId ?? progress.currentStep;

    // Get step config
    const stepConfigs = await this.onboardingConfig.getActiveSteps();
    const step = stepConfigs.find((s) => s.key === stepId);

    if (!step) {
      return { success: true, data: { valid: false, errors: { _step: 'unknown_step' } } };
    }

    const errors = validateStepFields(step, body.data);

    return {
      success: true,
      data: { valid: Object.keys(errors).length === 0, errors },
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
      data: this.buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes),
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
    const result = await this.useCases.completeOnboardingFromProgressUseCase.execute(user.userId);
    this.eventEmitter.emit('auth.session.invalidate', { userId: user.userId });
    return {
      success: true,
      data: result as CompleteOnboardingResponseDto,
      resumeId: result.resumeId,
    } as DataResponse<CompleteOnboardingResponseDto> & { resumeId: string };
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
    return { success: true, data: this.buildSession(data, stepConfigs, strengthConfig) };
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
    const result = await this.useCases.completeOnboardingUseCase.execute(user.userId, data);
    this.eventEmitter.emit('auth.session.invalidate', { userId: user.userId });
    return {
      success: true,
      data: result as CompleteOnboardingResponseDto,
      resumeId: result.resumeId,
    } as DataResponse<CompleteOnboardingResponseDto> & { resumeId: string };
  }

  // ============================================================================
  // Private: Build session response
  // ============================================================================

  buildSession(
    data: OnboardingProgressData,
    stepConfigs: OnboardingStepConfig[],
    strengthConfig?: import('../../domain/ports/onboarding-config.port').StrengthConfig,
    locale = 'en',
    systemThemes?: OnboardingThemeOption[],
    userDefaults?: { name?: string; email?: string },
    sectionTypes?: SectionTypeData[],
  ): OnboardingSessionDto {
    const steps = this.resolveSteps(stepConfigs, locale, systemThemes, sectionTypes);
    const currentStepIndex = steps.findIndex((s) => s.id === data.currentStep);
    const totalSteps = steps.length;

    const rawPersonalInfo = this.toPersonalInfo(data.personalInfo);
    const personalInfo =
      rawPersonalInfo ??
      (userDefaults
        ? {
            fullName: userDefaults.name ?? '',
            email: userDefaults.email ?? '',
          }
        : undefined);
    const professionalProfile = this.toProfessionalProfile(data.professionalProfile);
    const templateSelection = this.toTemplateSelection(data.templateSelection);

    const currentStepConfig = stepConfigs.find((s) => s.key === data.currentStep);
    const canProceed = currentStepConfig
      ? canProceedFromStep(currentStepConfig, {
          username: data.username,
          personalInfo,
          professionalProfile,
          templateSelection,
        })
      : true;

    const nextStep = currentStepIndex < totalSteps - 1 ? steps[currentStepIndex + 1]?.id : null;
    const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1]?.id : null;

    const strength = strengthConfig
      ? calculateStrength(stepConfigs, strengthConfig, {
          personalInfo,
          username: data.username ?? undefined,
          professionalProfile,
          sections: data.sections,
          templateSelection,
        })
      : undefined;

    const progress = totalSteps > 1 ? Math.round((currentStepIndex / (totalSteps - 1)) * 100) : 0;

    const { missingSteps: missingRequired } = canCompleteOnboarding(
      stepConfigs,
      data.completedSteps,
      { username: data.username, personalInfo, professionalProfile, templateSelection },
    );

    return {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      progress,
      strength: strength
        ? { score: strength.score, message: strength.message, level: strength.level }
        : undefined,
      canProceed,
      missingRequired,
      nextStep: nextStep ?? null,
      previousStep: previousStep ?? null,
      steps: steps as OnboardingSessionDto['steps'],
      username: data.username ?? undefined,
      personalInfo,
      professionalProfile,
      sections: data.sections?.map((s) => ({
        sectionTypeKey: s.sectionTypeKey,
        items: s.items?.map((item) => this.toItem(item)),
        noData: s.noData,
      })),
      templateSelection,
    } as OnboardingSessionDto;
  }

  private resolveSteps(
    stepConfigs: OnboardingStepConfig[],
    locale: string,
    systemThemes?: OnboardingThemeOption[],
    sectionTypes?: SectionTypeData[],
  ) {
    const sectionMap = new Map((sectionTypes ?? []).map((st) => [st.key, st]));

    return stepConfigs.map((step) => {
      const t = step.translations[locale] ?? step.translations.en ?? {};
      let fields = step.fields.map((f) => ({
        key: f.key,
        type: f.type,
        label: t.fieldLabels?.[f.key] ?? f.key,
        required: f.required,
        widget: f.widget,
        options: undefined as string[] | undefined,
        examples: f.examples,
        minLength: step.validation.minLength?.[f.key],
        maxLength: step.validation.maxLength?.[f.key],
      }));

      if (fields.length === 0 && step.sectionTypeKey) {
        const sectionType = sectionMap.get(step.sectionTypeKey);
        if (sectionType?.definition) {
          const def = sectionType.definition as SectionDefinition;
          if (def.fields) {
            fields = def.fields
              .filter((f) => f.key && f.type !== 'array' && f.type !== 'object')
              .map((f) => {
                const meta = (f.meta ?? {}) as Record<string, unknown>;
                let uiType: string;
                if (f.type === 'enum') uiType = 'select';
                else if (f.type === 'date') uiType = 'date';
                else if (f.type === 'number') uiType = 'number';
                else if (f.type === 'boolean') uiType = 'checkbox';
                else
                  uiType =
                    typeof meta.widget === 'string' && meta.widget === 'textarea'
                      ? 'textarea'
                      : 'text';
                return {
                  key: f.key!,
                  type: uiType,
                  label: typeof meta.label === 'string' ? meta.label : f.key!,
                  required: f.required ?? false,
                  widget: typeof meta.widget === 'string' ? meta.widget : undefined,
                  options: f.enum,
                  examples: undefined as string[] | undefined,
                  minLength: undefined as number | undefined,
                  maxLength: undefined as number | undefined,
                };
              });
          }
        }
      }

      const result: Record<string, unknown> = {
        id: step.key,
        label: t.label ?? step.key,
        description: t.description ?? '',
        required: step.required,
        component: step.component,
        icon: step.icon,
        ...(fields.length > 0 ? { fields } : {}),
        ...(t.noDataLabel ? { noDataLabel: t.noDataLabel } : {}),
        ...(t.placeholder ? { placeholder: t.placeholder } : {}),
        ...(t.addLabel ? { addLabel: t.addLabel } : {}),
        ...(step.sectionTypeKey
          ? { multipleItems: true, sectionTypeKey: step.sectionTypeKey }
          : {}),
      };

      if (step.component === 'template' && systemThemes?.length) {
        result.data = systemThemes.map((th) => ({
          id: th.id,
          name: th.name,
          description: th.description,
          category: th.category,
          tags: th.tags,
          atsScore: th.atsScore,
          thumbnailUrl: th.thumbnailUrl,
        }));
      }

      return result;
    });
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

  private toPersonalInfo(value: unknown): PersonalInfoDto | undefined {
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

  private toProfessionalProfile(value: unknown): ProfessionalProfileDto | undefined {
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

  private toTemplateSelection(value: unknown): TemplateSelectionDto | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    return {
      templateId: typeof obj.templateId === 'string' ? obj.templateId : undefined,
      colorScheme: typeof obj.colorScheme === 'string' ? obj.colorScheme : undefined,
    };
  }
}
