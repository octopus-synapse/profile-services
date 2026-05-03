/**
 * Onboarding Validation
 *
 * Config-based validation: receives OnboardingStepConfig from DB
 * and validates required fields generically.
 */

import type { OnboardingStepConfig } from '../ports/onboarding-config.port';
import type { OnboardingDataForValidation } from './onboarding-validation.types';
import { validateWithConfig } from './onboarding-validation-config.rules';

export type { OnboardingDataForValidation };

export function canProceedFromStep(
  step: OnboardingStepConfig,
  data: OnboardingDataForValidation,
): boolean {
  return validateWithConfig(step, data);
}

export function canCompleteOnboarding(
  steps: OnboardingStepConfig[],
  completedSteps: string[],
  data: OnboardingDataForValidation,
): { valid: boolean; missingSteps: string[] } {
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
