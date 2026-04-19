import type { SectionDefinition } from '@/shared-kernel/schemas/sections';
import type {
  OnboardingThemeOption,
  SectionTypeData,
} from '../../domain/config/onboarding-steps.config';
import { calculateStrength } from '../../domain/config/onboarding-strength';
import {
  canCompleteOnboarding,
  canProceedFromStep,
} from '../../domain/config/onboarding-validation';
import type {
  OnboardingStepConfig,
  StrengthConfig,
} from '../../domain/ports/onboarding-config.port';
import type { OnboardingProgressData } from '../../domain/ports/onboarding-progress.port';
import type {
  OnboardingSessionDto,
  PersonalInfoDto,
  ProfessionalProfileDto,
  SectionItemDto,
  TemplateSelectionDto,
} from '../dto';

/**
 * Session/step view-model presenters used by OnboardingController. Kept
 * outside the controller so the HTTP layer stays free of iteration and data
 * transformation. All functions are pure — they only depend on inputs.
 */

export function toPersonalInfo(value: unknown): PersonalInfoDto | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.fullName !== 'string') return undefined;
  return {
    fullName: obj.fullName,
    email: typeof obj.email === 'string' ? obj.email : undefined,
    phone: typeof obj.phone === 'string' ? obj.phone : undefined,
    location: typeof obj.location === 'string' ? obj.location : undefined,
  };
}

export function toProfessionalProfile(value: unknown): ProfessionalProfileDto | undefined {
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

export function toTemplateSelection(value: unknown): TemplateSelectionDto | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;
  return {
    templateId: typeof obj.templateId === 'string' ? obj.templateId : undefined,
    colorScheme: typeof obj.colorScheme === 'string' ? obj.colorScheme : undefined,
  };
}

export function toItem(item: unknown): SectionItemDto {
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

type ResolvedStep = Record<string, unknown>;

function inferUiType(fieldType: string, widget: unknown): string {
  if (fieldType === 'enum') return 'select';
  if (fieldType === 'date') return 'date';
  if (fieldType === 'number') return 'number';
  if (fieldType === 'boolean') return 'checkbox';
  if (typeof widget === 'string' && widget === 'textarea') return 'textarea';
  return 'text';
}

function buildFieldsFromSectionDefinition(def: SectionDefinition) {
  const out: Array<{
    key: string;
    type: string;
    label: string;
    required: boolean;
    widget: string | undefined;
    options: string[] | undefined;
    examples: string[] | undefined;
    minLength: number | undefined;
    maxLength: number | undefined;
  }> = [];
  for (const f of def.fields ?? []) {
    if (!f.key) continue;
    if (f.type === 'array' || f.type === 'object') continue;
    const meta = (f.meta ?? {}) as Record<string, unknown>;
    const uiType = inferUiType(f.type, meta.widget);
    out.push({
      key: f.key,
      type: uiType,
      label: typeof meta.label === 'string' ? meta.label : f.key,
      required: f.required ?? false,
      widget: typeof meta.widget === 'string' ? meta.widget : undefined,
      options: f.enum,
      examples: undefined,
      minLength: undefined,
      maxLength: undefined,
    });
  }
  return out;
}

function buildFieldsFromStep(
  step: OnboardingStepConfig,
  translations: { fieldLabels?: Record<string, string> },
) {
  const out: Array<{
    key: string;
    type: string;
    label: string;
    required: boolean;
    widget: string | undefined;
    options: string[] | undefined;
    examples: string[] | undefined;
    minLength: number | undefined;
    maxLength: number | undefined;
  }> = [];
  for (const f of step.fields) {
    out.push({
      key: f.key,
      type: f.type,
      label: translations.fieldLabels?.[f.key] ?? f.key,
      required: f.required,
      widget: f.widget,
      options: undefined,
      examples: f.examples,
      minLength: step.validation.minLength?.[f.key],
      maxLength: step.validation.maxLength?.[f.key],
    });
  }
  return out;
}

function buildThemeOptions(systemThemes: OnboardingThemeOption[]) {
  const out: Array<{
    id: string;
    name: string;
    description: OnboardingThemeOption['description'];
    category: OnboardingThemeOption['category'];
    tags: OnboardingThemeOption['tags'];
    atsScore: OnboardingThemeOption['atsScore'];
    thumbnailUrl: OnboardingThemeOption['thumbnailUrl'];
  }> = [];
  for (const th of systemThemes) {
    out.push({
      id: th.id,
      name: th.name,
      description: th.description,
      category: th.category,
      tags: th.tags,
      atsScore: th.atsScore,
      thumbnailUrl: th.thumbnailUrl,
    });
  }
  return out;
}

export function resolveSteps(
  stepConfigs: OnboardingStepConfig[],
  locale: string,
  systemThemes?: OnboardingThemeOption[],
  sectionTypes?: SectionTypeData[],
): ResolvedStep[] {
  const sectionMap = new Map<string, SectionTypeData>();
  for (const st of sectionTypes ?? []) sectionMap.set(st.key, st);

  const out: ResolvedStep[] = [];
  for (const step of stepConfigs) {
    const t = step.translations[locale] ?? step.translations.en ?? {};
    let fields = buildFieldsFromStep(step, t);

    if (fields.length === 0 && step.sectionTypeKey) {
      const sectionType = sectionMap.get(step.sectionTypeKey);
      const def = sectionType?.definition as SectionDefinition | undefined;
      if (def?.fields) fields = buildFieldsFromSectionDefinition(def);
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
      ...(step.sectionTypeKey ? { multipleItems: true, sectionTypeKey: step.sectionTypeKey } : {}),
    };

    if (step.component === 'template' && systemThemes?.length) {
      result.data = buildThemeOptions(systemThemes);
    }

    out.push(result);
  }
  return out;
}

function buildSectionsView(sections: OnboardingProgressData['sections']) {
  if (!sections) return undefined;
  const out: Array<{
    sectionTypeKey: string;
    items?: SectionItemDto[];
    noData?: boolean;
  }> = [];
  for (const s of sections) {
    const itemsView: SectionItemDto[] | undefined = s.items ? [] : undefined;
    if (s.items && itemsView) {
      for (const item of s.items) itemsView.push(toItem(item));
    }
    out.push({ sectionTypeKey: s.sectionTypeKey, items: itemsView, noData: s.noData });
  }
  return out;
}

export function buildSession(
  data: OnboardingProgressData,
  stepConfigs: OnboardingStepConfig[],
  strengthConfig?: StrengthConfig,
  locale = 'en',
  systemThemes?: OnboardingThemeOption[],
  userDefaults?: { name?: string; email?: string },
  sectionTypes?: SectionTypeData[],
): OnboardingSessionDto {
  const steps = resolveSteps(stepConfigs, locale, systemThemes, sectionTypes);
  const currentStepIndex = steps.findIndex((s) => s.id === data.currentStep);
  const totalSteps = steps.length;

  const rawPersonalInfo = toPersonalInfo(data.personalInfo);
  const personalInfo =
    rawPersonalInfo ??
    (userDefaults
      ? {
          fullName: userDefaults.name ?? '',
          email: userDefaults.email ?? '',
        }
      : undefined);
  const professionalProfile = toProfessionalProfile(data.professionalProfile);
  const templateSelection = toTemplateSelection(data.templateSelection);

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
    sections: buildSectionsView(data.sections),
    templateSelection,
  } as OnboardingSessionDto;
}
