/** Step identifier types */
export type StaticStep =
  | 'welcome'
  | 'personal-info'
  | 'username'
  | 'professional-profile'
  | 'template'
  | 'review'
  | 'complete';

export type SectionStep = `section:${string}`;
export type OnboardingStepId = StaticStep | SectionStep;

/** Field descriptor for a step — drives frontend form rendering */
export interface StepField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  widget?: string;
}

/** Step metadata — includes everything the frontend needs to render */
export interface StepMeta {
  id: string;
  label: string;
  description: string;
  required: boolean;
  component: string;
  icon?: string;
  fields?: StepField[];
  noDataLabel?: string;
  placeholder?: string;
  addLabel?: string;
  data?: Record<string, unknown>[];
}

/** Feature descriptor for welcome step */
export interface WelcomeFeature {
  icon: string;
  title: string;
  description: string;
}

/** Translations for static steps */
export type StepTranslation = {
  label: string;
  description: string;
  fields?: Record<string, string>;
  features?: WelcomeFeature[];
};

/** Static step base definitions (without translations) */
export interface StaticStepBase {
  id: string;
  required: boolean;
  component: string;
  icon: string;
  fields?: Omit<StepField, 'label'>[];
  data?: Record<string, unknown>;
}

/** Section type data from database — includes resolved translations */
export interface SectionTypeData {
  key: string;
  title: string;
  description: string;
  definition: unknown;
  icon: string;
  iconType: string;
  // Resolved translations (already for current locale)
  label: string;
  noDataLabel: string;
  placeholder: string;
  addLabel: string;
}

/** Minimal style data for the onboarding style-picker step. */
export interface OnboardingThemeOption {
  id: string;
  name: string;
  description: string | null;
  styleScore: number;
  thumbnailUrl: string | null;
}
