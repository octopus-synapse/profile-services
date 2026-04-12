/**
 * Onboarding Validation
 *
 * Supports two modes:
 * 1. Config-based (new): receives OnboardingStepConfig from DB, validates generically
 * 2. String-based (legacy): receives step key string, validates with hardcoded rules
 *
 * Legacy mode will be removed once all use cases are migrated to use OnboardingConfigPort.
 */

import type { OnboardingStepConfig } from '../ports/onboarding-config.port';

export interface OnboardingDataForValidation {
  username?: string | null;
  personalInfo?:
    | { fullName?: string; email?: string; phone?: string; location?: string }
    | Record<string, string | undefined>;
  professionalProfile?:
    | { jobTitle?: string; summary?: string }
    | Record<string, string | undefined>;
  templateSelection?:
    | { colorScheme?: string; templateId?: string }
    | Record<string, string | undefined>;
  [key: string]: unknown;
}

function getFieldValue(
  data: OnboardingDataForValidation,
  _stepKey: string,
  fieldKey: string,
): string | undefined {
  if (fieldKey === 'username') return (data.username as string) ?? undefined;

  const dataSources = [data.personalInfo, data.professionalProfile, data.templateSelection];
  for (const source of dataSources) {
    if (source && typeof source === 'object' && fieldKey in source) {
      const val = (source as Record<string, unknown>)[fieldKey];
      if (typeof val === 'string') return val;
    }
  }
  return undefined;
}

function validateWithConfig(
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

function validateLegacy(currentStep: string, data: OnboardingDataForValidation): boolean {
  switch (currentStep) {
    case 'welcome':
    case 'review':
    case 'complete':
      return true;
    case 'personal-info':
      return Boolean(data.personalInfo?.fullName && data.personalInfo?.email);
    case 'username':
      return Boolean(
        data.username &&
          (data.username as string).length >= 3 &&
          (data.username as string).length <= 30,
      );
    case 'professional-profile':
      return Boolean(data.professionalProfile?.jobTitle?.trim());
    case 'template':
      return Boolean(data.templateSelection?.colorScheme);
    default:
      return true;
  }
}

export function canProceedFromStep(
  stepOrKey: OnboardingStepConfig | string,
  data: OnboardingDataForValidation,
): boolean {
  if (typeof stepOrKey === 'string') {
    return validateLegacy(stepOrKey, data);
  }
  return validateWithConfig(stepOrKey, data);
}

// Legacy signature: canCompleteOnboarding(completedSteps: string[], data)
// New signature: canCompleteOnboarding(steps: OnboardingStepConfig[], completedSteps: string[], data)
export function canCompleteOnboarding(
  stepsOrCompleted: OnboardingStepConfig[] | string[],
  completedOrData: string[] | OnboardingDataForValidation,
  dataArg?: OnboardingDataForValidation,
): { valid: boolean; missingSteps: string[] } {
  if (!dataArg && !Array.isArray(completedOrData)) {
    return canCompleteOnboardingLegacy(stepsOrCompleted as string[], completedOrData);
  }

  const steps = stepsOrCompleted as OnboardingStepConfig[];
  const completedSteps = completedOrData as string[];
  const data = dataArg ?? {};
  const missingSteps: string[] = [];

  for (const step of steps) {
    if (!step.required) continue;
    if (
      step.component === 'welcome' ||
      step.component === 'complete' ||
      step.component === 'review'
    )
      continue;

    if (!completedSteps.includes(step.key)) {
      missingSteps.push(step.key);
      continue;
    }

    if (!validateWithConfig(step, data)) {
      missingSteps.push(step.key);
    }
  }

  return { valid: missingSteps.length === 0, missingSteps };
}

function canCompleteOnboardingLegacy(
  completedSteps: string[],
  data: OnboardingDataForValidation,
): { valid: boolean; missingSteps: string[] } {
  const requiredSteps = [
    'welcome',
    'personal-info',
    'username',
    'professional-profile',
    'template',
    'review',
  ];
  const missingSteps: string[] = [];

  for (const step of requiredSteps) {
    if (!completedSteps.includes(step)) {
      missingSteps.push(step);
    }
  }

  if (!data.personalInfo?.fullName || !data.personalInfo?.email) {
    if (!missingSteps.includes('personal-info')) missingSteps.push('personal-info');
  }
  if (!data.username || (data.username as string).length < 3) {
    if (!missingSteps.includes('username')) missingSteps.push('username');
  }
  if (!data.professionalProfile?.jobTitle?.trim()) {
    if (!missingSteps.includes('professional-profile')) missingSteps.push('professional-profile');
  }
  if (!data.templateSelection?.colorScheme) {
    if (!missingSteps.includes('template')) missingSteps.push('template');
  }

  return { valid: missingSteps.length === 0, missingSteps };
}
