/**
 * Onboarding Validation
 *
 * Server-side validation for onboarding step progression.
 * Single source of truth - frontend just renders based on canProceed.
 */

import type {
  OnboardingPersonalInfoDto,
  OnboardingProfessionalProfileDto,
  OnboardingTemplateSelectionDto,
} from '@/shared-kernel/dtos/sdk-request.dto';

export interface OnboardingDataForValidation {
  username?: string | null;
  personalInfo?: OnboardingPersonalInfoDto;
  professionalProfile?: OnboardingProfessionalProfileDto;
  templateSelection?: OnboardingTemplateSelectionDto;
}

/**
 * Check if user can proceed from current step
 */
export function canProceedFromStep(
  currentStep: string,
  data: OnboardingDataForValidation,
): boolean {
  switch (currentStep) {
    case 'welcome':
      return true;

    case 'personal-info':
      return Boolean(data.personalInfo?.fullName && data.personalInfo?.email);

    case 'username':
      return Boolean(data.username && data.username.length >= 3 && data.username.length <= 30);

    case 'professional-profile':
      return Boolean(data.professionalProfile?.jobTitle);

    case 'template':
      return Boolean(data.templateSelection?.colorScheme);

    case 'review':
      return true;

    case 'complete':
      return true;

    default:
      // Section steps are optional
      if (currentStep.startsWith('section:')) {
        return true;
      }
      return true;
  }
}

/**
 * Validate all required steps before completion
 */
export function canCompleteOnboarding(
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

  // Also validate data integrity
  if (!data.personalInfo?.fullName || !data.personalInfo?.email) {
    if (!missingSteps.includes('personal-info')) {
      missingSteps.push('personal-info');
    }
  }

  if (!data.username || data.username.length < 3) {
    if (!missingSteps.includes('username')) {
      missingSteps.push('username');
    }
  }

  if (!data.professionalProfile?.jobTitle) {
    if (!missingSteps.includes('professional-profile')) {
      missingSteps.push('professional-profile');
    }
  }

  if (!data.templateSelection?.colorScheme) {
    if (!missingSteps.includes('template')) {
      missingSteps.push('template');
    }
  }

  return {
    valid: missingSteps.length === 0,
    missingSteps,
  };
}
