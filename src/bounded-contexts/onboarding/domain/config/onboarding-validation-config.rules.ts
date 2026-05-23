import type { OnboardingStepConfig } from '../ports/onboarding-config.port';
import type { OnboardingDataForValidation } from './onboarding-validation.types';

function getFieldValue(
  data: OnboardingDataForValidation,
  _stepKey: string,
  fieldKey: string,
): string | undefined {
  if (fieldKey === 'username') return (data.username as string) ?? undefined;
  // The resume-style step lives off the FK column, not a nested object —
  // the validator needs a special-case lookup so step configs that mark
  // `resumeStyleId` as required can still gate completion.
  if (fieldKey === 'resumeStyleId') return data.resumeStyleId ?? undefined;

  const dataSources = [data.personalInfo, data.professionalProfile];
  for (const source of dataSources) {
    if (source && typeof source === 'object' && fieldKey in source) {
      const val = (source as Record<string, unknown>)[fieldKey];
      if (typeof val === 'string') return val;
    }
  }
  return undefined;
}

export function validateWithConfig(
  step: OnboardingStepConfig,
  data: OnboardingDataForValidation,
): boolean {
  const validation = step.validation;
  if (!validation.requiredFields?.length) return true;

  for (const field of validation.requiredFields) {
    const value = getFieldValue(data, step.key, field);
    if (!value?.trim()) return false;
    if (validation.minLength?.[field] && value.length < validation.minLength[field]) return false;
    if (validation.maxLength?.[field] && value.length > validation.maxLength[field]) return false;
  }

  return true;
}
