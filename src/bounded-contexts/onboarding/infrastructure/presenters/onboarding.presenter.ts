import type { SectionDefinition } from '@/shared-kernel/schemas/sections';
import {
  EXTRA_SECTION_KEYS,
  extraStepKey,
} from '../../domain/config/onboarding-section-defaults.config';
import type {
  OnboardingResumeStyleOption,
  SectionTypeData,
} from '../../domain/config/onboarding-steps.config';
import { calculateStrength } from '../../domain/config/onboarding-strength';
import {
  canCompleteOnboarding,
  canProceedFromStep,
} from '../../domain/config/onboarding-validation.rules';
import type {
  OnboardingStepConfig,
  StrengthConfig,
} from '../../domain/ports/onboarding-config.port';
import type { OnboardingProgressData } from '../../domain/ports/onboarding-progress.port';

/** Set of OnboardingStep.key values that are gated behind `activatedExtras`. */
const EXTRA_STEP_KEYS: ReadonlySet<string> = new Set(
  EXTRA_SECTION_KEYS.map((k) => extraStepKey(k)),
);

import type {
  OnboardingSessionDto,
  PersonalInfoDto,
  ProfessionalProfileViewDto,
  SectionItemDto,
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
    phone: typeof obj.phone === 'string' ? obj.phone : undefined,
    location: typeof obj.location === 'string' ? obj.location : undefined,
  };
}

export function toProfessionalProfile(value: unknown): ProfessionalProfileViewDto | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;
  return {
    headline: typeof obj.headline === 'string' ? obj.headline : undefined,
    summary: typeof obj.summary === 'string' ? obj.summary : undefined,
    linkedin: typeof obj.linkedin === 'string' ? obj.linkedin : undefined,
    github: typeof obj.github === 'string' ? obj.github : undefined,
    website: typeof obj.website === 'string' ? obj.website : undefined,
    portfolio: typeof obj.portfolio === 'string' ? obj.portfolio : undefined,
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

interface FieldOut {
  key: string;
  type: string;
  label: string;
  required: boolean;
  widget: string | undefined;
  options: Array<{ value: string; label: string }> | undefined;
  enumName: string | undefined;
  examples: string[] | undefined;
  minLength: number | undefined;
  maxLength: number | undefined;
}

/** Shape the resolver emits per field (label flattened, options localized). */
interface ResolvedField {
  key?: string;
  type: string;
  label?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  meta?: { widget?: unknown; hidden?: unknown; enumName?: unknown };
}

/**
 * Build the editor fields for a section-backed step. The definition arrives
 * ALREADY locale-resolved from SectionTypeDefinitionAdapter (the same shared
 * resolver the Profile sections endpoint uses) — translated labels flattened
 * to the field root + localized enum {value,label} pairs — so onboarding and
 * Profile render identically. We only flatten that into the editor field shape.
 */
function buildFieldsFromSectionDefinition(def: SectionDefinition): FieldOut[] {
  const out: FieldOut[] = [];
  for (const f of (def.fields ?? []) as ResolvedField[]) {
    if (!f.key) continue;
    if (f.type === 'array' || f.type === 'object') continue;
    // Derived-only fields (e.g. companyDomain, roleSeniority) never render.
    if (f.meta?.hidden === true) continue;
    out.push({
      key: f.key,
      type: inferUiType(f.type, f.meta?.widget),
      label: f.label ?? f.key,
      required: f.required ?? false,
      widget: typeof f.meta?.widget === 'string' ? f.meta.widget : undefined,
      options: f.options,
      enumName: typeof f.meta?.enumName === 'string' ? f.meta.enumName : undefined,
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
): FieldOut[] {
  const out: FieldOut[] = [];
  for (const f of step.fields) {
    out.push({
      key: f.key,
      type: f.type,
      label: translations.fieldLabels?.[f.key] ?? f.key,
      required: f.required,
      widget: f.widget,
      options: undefined,
      enumName: undefined,
      examples: f.examples,
      minLength: step.validation.minLength?.[f.key],
      maxLength: step.validation.maxLength?.[f.key],
    });
  }
  return out;
}

function buildResumeStyleOptions(styles: OnboardingResumeStyleOption[]) {
  return styles.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    styleScore: s.styleScore,
    thumbnailUrl: s.thumbnailUrl,
  }));
}

export function resolveSteps(
  stepConfigs: OnboardingStepConfig[],
  locale: string,
  resumeStyles?: OnboardingResumeStyleOption[],
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

    if (step.component === 'resume-style' && resumeStyles?.length) {
      result.data = buildResumeStyleOptions(resumeStyles);
    }

    out.push(result);
  }
  return out;
}

function buildSectionsView(sections: OnboardingProgressData['sections']) {
  if (!sections) return undefined;
  const out: Array<{ sectionTypeKey: string; items?: SectionItemDto[]; noData?: boolean }> = [];
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
  resumeStyles?: OnboardingResumeStyleOption[],
  userDefaults?: { name?: string },
  sectionTypes?: SectionTypeData[],
): OnboardingSessionDto {
  const allResolved = resolveSteps(stepConfigs, locale, resumeStyles, sectionTypes);
  // Split the resolved set into core steps (always shown) and extras
  // (only shown after the user opts into them). The catalog of every
  // extra still ships back as `availableExtras` so the gate UI can
  // render the checkbox list.
  const activatedExtras = new Set(data.activatedExtras ?? []);
  const availableExtras = allResolved.filter((s) => EXTRA_STEP_KEYS.has(String(s.id)));
  const steps = allResolved.filter(
    (s) => !EXTRA_STEP_KEYS.has(String(s.id)) || activatedExtras.has(String(s.id)),
  );
  const currentStepIndex = steps.findIndex((s) => s.id === data.currentStep);
  const totalSteps = steps.length;

  const rawPersonalInfo = toPersonalInfo(data.personalInfo);
  const personalInfo =
    rawPersonalInfo ?? (userDefaults ? { fullName: userDefaults.name ?? '' } : undefined);
  const professionalProfile = toProfessionalProfile(data.professionalProfile);
  const resumeStyleId = data.resumeStyleId ?? undefined;

  const currentStepConfig = stepConfigs.find((s) => s.key === data.currentStep);
  const canProceed = currentStepConfig
    ? canProceedFromStep(currentStepConfig, {
        username: data.username,
        personalInfo,
        professionalProfile,
        resumeStyleId,
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
        resumeStyleId,
      })
    : undefined;

  const progress = totalSteps > 1 ? Math.round((currentStepIndex / (totalSteps - 1)) * 100) : 0;

  const { missingSteps: missingRequired } = canCompleteOnboarding(
    stepConfigs,
    data.completedSteps,
    { username: data.username, personalInfo, professionalProfile, resumeStyleId },
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
    availableExtras: availableExtras as OnboardingSessionDto['availableExtras'],
    activatedExtras: data.activatedExtras ?? [],
    username: data.username ?? undefined,
    personalInfo,
    professionalProfile,
    sections: buildSectionsView(data.sections),
    resumeStyleId,
  } as OnboardingSessionDto;
}
