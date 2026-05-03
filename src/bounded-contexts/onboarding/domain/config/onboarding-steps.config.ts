/**
 * Onboarding Steps Configuration
 *
 * Single source of truth for onboarding flow steps.
 * Session/Commands API — backend drives the entire flow.
 *
 * Types: ./onboarding-steps.types
 * Translations: ./onboarding-translations.config
 * Static step bases: ./onboarding-static-steps.config
 * Section defaults: ./onboarding-section-defaults.config
 */

import type { SectionDefinition } from '@/shared-kernel/schemas/sections';
import { DEFAULT_SECTION_LABELS, SECTION_ORDER_KEYS } from './onboarding-section-defaults.config';
import {
  buildStaticSteps,
  STATIC_STEPS_AFTER,
  STATIC_STEPS_BEFORE,
} from './onboarding-static-steps.config';
import type {
  OnboardingThemeOption,
  SectionStep,
  SectionTypeData,
  StepField,
  StepMeta,
} from './onboarding-steps.types';

export type {
  OnboardingStepId,
  OnboardingThemeOption,
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
        label: typeof meta.label === 'string' ? meta.label : fieldKey,
        required: f.required ?? false,
        options: f.enum,
        widget: typeof meta.widget === 'string' ? meta.widget : undefined,
      };
    });
}

export function buildOnboardingSteps(
  sectionTypeData?: SectionTypeData[],
  locale = 'en',
  systemThemes?: OnboardingThemeOption[],
): StepMeta[] {
  const sectionMap = new Map((sectionTypeData ?? []).map((st) => [st.key, st]));

  const sectionSteps: StepMeta[] = SECTION_ORDER_KEYS.map((key) => {
    const dbData = sectionMap.get(key);
    const fallback = DEFAULT_SECTION_LABELS[key];

    const label = dbData?.label || fallback?.label || key;
    const icon = dbData?.icon || fallback?.icon || '📄';
    const noDataLabel = dbData?.noDataLabel || fallback?.noDataLabel || "I don't have items to add";
    const placeholder = dbData?.placeholder || fallback?.placeholder || 'Add items...';
    const addLabel = dbData?.addLabel || fallback?.addLabel || 'Add Item';
    const title = dbData?.title || key.replace(/_/g, ' ').replace('v1', '').trim();
    const required = fallback?.required ?? false;

    let fields: StepField[] | undefined;
    if (dbData?.definition) {
      try {
        const def = dbData.definition as SectionDefinition;
        if (def.fields && Array.isArray(def.fields)) fields = mapDefinitionToFields(def);
      } catch {
        // Fallback: no fields if definition is invalid
      }
    }

    return {
      id: `section:${key}`,
      label,
      description: title,
      required,
      component: 'generic-section',
      icon,
      fields,
      noDataLabel,
      placeholder,
      addLabel,
    };
  });

  const afterSteps = buildStaticSteps(STATIC_STEPS_AFTER, locale);

  // Inject system themes as data into the template step
  if (systemThemes?.length) {
    const templateStep = afterSteps.find((s) => s.id === 'template');
    if (templateStep) {
      templateStep.data = systemThemes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        styleScore: t.styleScore,
        thumbnailUrl: t.thumbnailUrl,
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
