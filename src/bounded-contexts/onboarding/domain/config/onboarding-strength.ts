/**
 * Resume Strength Calculator
 *
 * Uses weights from database (OnboardingStep.strengthWeight)
 * and thresholds from OnboardingConfig.strengthLevels.
 */

import type {
  OnboardingStepConfig,
  StrengthConfig,
  StrengthLevel,
} from '../ports/onboarding-config.port';

export interface ResumeStrength {
  score: number;
  message: string;
  level: string;
}

interface StrengthInput {
  personalInfo?: { fullName?: string; email?: string };
  username?: string;
  professionalProfile?: { jobTitle?: string; summary?: string };
  sections?: Array<{ sectionTypeKey: string; items?: unknown[]; noData?: boolean }>;
  templateSelection?: { templateId?: string; colorScheme?: string };
}

function hasItems(sections: StrengthInput['sections'], key: string): boolean {
  const section = sections?.find((s) => s.sectionTypeKey === key);
  if (!section) return false;
  if (section.noData) return false;
  return Array.isArray(section.items) && section.items.length > 0;
}

function isStepFilled(step: OnboardingStepConfig, data: StrengthInput): boolean {
  switch (step.component) {
    case 'personal-info':
      return Boolean(data.personalInfo?.fullName && data.personalInfo?.email);
    case 'username':
      return Boolean(data.username);
    case 'professional-profile':
      return Boolean(data.professionalProfile?.jobTitle);
    case 'template':
      return Boolean(data.templateSelection?.templateId || data.templateSelection?.colorScheme);
    case 'generic-section':
      return step.sectionTypeKey ? hasItems(data.sections, step.sectionTypeKey) : false;
    default:
      return false;
  }
}

export function calculateStrength(
  steps: OnboardingStepConfig[],
  strengthConfig: StrengthConfig,
  data: StrengthInput,
): ResumeStrength {
  let score = 0;

  for (const step of steps) {
    if (step.strengthWeight > 0 && isStepFilled(step, data)) {
      score += step.strengthWeight;
    }
  }

  const sorted = [...strengthConfig.levels].sort((a, b) => b.minScore - a.minScore);
  const matched: StrengthLevel = sorted.find((l) => score >= l.minScore) ?? {
    minScore: 0,
    level: 'weak',
    message: '',
  };

  return { score, message: matched.message, level: matched.level };
}
