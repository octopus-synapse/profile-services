/**
 * Onboarding Config Port
 *
 * Abstraction for loading onboarding flow configuration from the database.
 */

export interface OnboardingStepField {
  key: string;
  type: string;
  widget?: string;
  required: boolean;
  examples?: string[];
}

export interface OnboardingStepTranslation {
  label: string;
  description?: string;
  fieldLabels?: Record<string, string>;
  noDataLabel?: string;
  placeholder?: string;
  addLabel?: string;
}

export interface OnboardingStepValidation {
  requiredFields?: string[];
  minLength?: Record<string, number>;
  maxLength?: Record<string, number>;
}

export interface OnboardingStepConfig {
  key: string;
  order: number;
  component: string;
  icon: string;
  required: boolean;
  sectionTypeKey: string | null;
  fields: OnboardingStepField[];
  translations: Record<string, OnboardingStepTranslation>;
  validation: OnboardingStepValidation;
  strengthWeight: number;
}

export interface StrengthLevel {
  minScore: number;
  level: string;
  message: string;
}

export interface StrengthConfig {
  levels: StrengthLevel[];
}

export abstract class OnboardingConfigPort {
  abstract getActiveSteps(): Promise<OnboardingStepConfig[]>;
  abstract getStrengthConfig(): Promise<StrengthConfig>;
}
