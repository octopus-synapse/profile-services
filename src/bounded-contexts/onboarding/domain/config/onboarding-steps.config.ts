/**
 * Onboarding Steps Configuration
 *
 * Single source of truth for onboarding flow steps.
 * Session/Commands API — backend drives the entire flow.
 *
 * Types: ./onboarding-steps.types
 * Translations: @packages/i18n (STATIC_STEP_DICTIONARY)
 * Static step bases: ./onboarding-static-steps.config
 * Section defaults: ./onboarding-section-defaults.config
 */

import type { SectionDefinition } from '@/shared-kernel/schemas/sections';
import { SECTION_ORDER_KEYS } from './onboarding-section-defaults.config';
import {
  buildStaticSteps,
  STATIC_STEPS_AFTER,
  STATIC_STEPS_BEFORE,
} from './onboarding-static-steps.config';
import type {
  OnboardingResumeStyleOption,
  SectionStep,
  SectionTypeData,
  StepField,
  StepMeta,
} from './onboarding-steps.types';

export type {
  OnboardingResumeStyleOption,
  OnboardingStepId,
  SectionStep,
  SectionTypeData,
  StaticStep,
  StepField,
  StepMeta,
} from './onboarding-steps.types';

/** Map SectionDefinition fields → StepField[] */
function mapDefinitionToFields(definition: SectionDefinition): StepField[] {
  return definition.fields
    .filter((f) => f.key && f.type !== 'array' && f.type !== 'object')
    .map((f) => {
      const fieldKey = f.key;
      if (!fieldKey) {
        // Internal invariant: filtered above by `f.key` predicate.
        throw new Error('Section definition field key is required');
      }

      const meta = (f.meta ?? {}) as Record<string, unknown>;
      // Label comes from the locale-resolved definition: resolveFieldsForLocale
      // flattens the translated label to the field root. No English meta.label
      // fallback — a missing label means the resolver should have thrown.
      const label = (f as { label?: unknown }).label;
      if (typeof label !== 'string' || label.trim().length === 0) {
        throw new Error(`[onboarding] field '${fieldKey}' has no resolved label for this locale`);
      }
      let uiType: string;
      if (f.type === 'enum') uiType = 'select';
      else if (f.type === 'date') uiType = 'date';
      else if (f.type === 'number') uiType = 'number';
      else if (f.type === 'boolean') uiType = 'checkbox';
      else
        uiType =
          typeof meta.widget === 'string' && meta.widget === 'textarea' ? 'textarea' : 'text';

      return {
        key: fieldKey,
        type: uiType,
        label,
        required: f.required ?? false,
        options: f.enum,
        widget: typeof meta.widget === 'string' ? meta.widget : undefined,
      };
    });
}

export function buildOnboardingSteps(
  sectionTypeData?: SectionTypeData[],
  locale = 'en',
  resumeStyles?: OnboardingResumeStyleOption[],
): StepMeta[] {
  const sectionMap = new Map((sectionTypeData ?? []).map((st) => [st.key, st]));

  const sectionSteps: StepMeta[] = SECTION_ORDER_KEYS.map((key) => {
    const dbData = sectionMap.get(key);
    // No fallback: an onboarding section must exist in the catalog (and thus
    // carry translations). A missing one is a BUG, not a key-as-label patch.
    if (!dbData) {
      throw new Error(
        `[onboarding] section '${key}' is not in the section-type catalog. ` +
          `Every SECTION_ORDER_KEY must be a seeded, translated section type.`,
      );
    }

    let fields: StepField[] | undefined;
    const def = dbData.definition as SectionDefinition | undefined;
    if (def?.fields && Array.isArray(def.fields)) {
      // Throws if a field has no resolved label — never swallowed.
      fields = mapDefinitionToFields(def);
    }

    return {
      id: `section:${key}`,
      label: dbData.label,
      description: dbData.title,
      required: false,
      component: 'generic-section',
      icon: dbData.icon,
      fields,
      noDataLabel: dbData.noDataLabel,
      placeholder: dbData.placeholder,
      addLabel: dbData.addLabel,
    };
  });

  const afterSteps = buildStaticSteps(STATIC_STEPS_AFTER, locale);

  // Inject the available system resume styles as data into the
  // resume-style step. The step id stays 'resume-style' so the
  // frontend stepper can branch on it.
  if (resumeStyles?.length) {
    const styleStep = afterSteps.find((s) => s.id === 'resume-style');
    if (styleStep) {
      styleStep.data = resumeStyles.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        styleScore: s.styleScore,
        thumbnailUrl: s.thumbnailUrl,
      }));
    }
  }

  return [...buildStaticSteps(STATIC_STEPS_BEFORE, locale), ...sectionSteps, ...afterSteps];
}

export function isSectionStep(stepId: string): stepId is SectionStep {
  return stepId.startsWith('section:');
}

export function getSectionTypeFromStep(stepId: SectionStep): string {
  return stepId.replace('section:', '');
}

export function getStepIndex(stepId: string, steps: StepMeta[]): number {
  return steps.findIndex((s) => s.id === stepId);
}

export function calculateProgress(currentStepIndex: number, totalSteps: number): number {
  if (totalSteps <= 1) return 0;
  return Math.round((currentStepIndex / (totalSteps - 1)) * 100);
}
