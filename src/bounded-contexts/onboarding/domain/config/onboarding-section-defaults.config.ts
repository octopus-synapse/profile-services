/** Section step order — which sections to show in onboarding */
export const SECTION_ORDER_KEYS = [
  'work_experience_v1',
  'education_v1',
  'skill_set_v1',
  'soft_skill_set_v1',
  'language_v1',
  'project_v1',
  'certification_v1',
  'award_v1',
  'publication_v1',
] as const;

/**
 * Core section steps — always visible in the stepper regardless of the
 * user's opt-in choice. These cover the spine of the résumé (history,
 * skills, languages).
 */
export const CORE_SECTION_KEYS = [
  'work_experience_v1',
  'education_v1',
  'skill_set_v1',
  'soft_skill_set_v1',
  'language_v1',
] as const;

/**
 * Extra section steps — only rendered after the user opts into them via
 * the "what else?" gate (`activatedExtras` on `OnboardingProgress`).
 * Listed here in the canonical display order. Use the
 * `extraStepKey('project_v1')` helper to derive the matching
 * `OnboardingStep.key`.
 */
export const EXTRA_SECTION_KEYS = [
  'project_v1',
  'certification_v1',
  'award_v1',
  'publication_v1',
] as const;

/** Convert a section type key (`project_v1`) to its step key (`section:project_v1`). */
export function extraStepKey(sectionTypeKey: string): string {
  return `section:${sectionTypeKey}`;
}

/** Default labels for fallback when DB data not available */
export const DEFAULT_SECTION_LABELS: Record<
  string,
  {
    label: string;
    required: boolean;
    icon: string;
    noDataLabel: string;
    placeholder: string;
    addLabel: string;
  }
> = {
  work_experience_v1: {
    label: 'Work Experience',
    required: false,
    icon: '💼',
    noDataLabel: "I don't have work experience to add",
    placeholder: 'Add your work experience...',
    addLabel: 'Add Experience',
  },
  education_v1: {
    label: 'Education',
    required: false,
    icon: '🎓',
    noDataLabel: "I don't have education to add",
    placeholder: 'Add your education...',
    addLabel: 'Add Education',
  },
  skill_set_v1: {
    label: 'Hard Skills',
    required: false,
    icon: '⚡',
    noDataLabel: "I'm still developing my technical skills",
    placeholder: 'Add your technical skills...',
    addLabel: 'Add Skill',
  },
  soft_skill_set_v1: {
    label: 'Soft Skills',
    required: false,
    icon: '🤝',
    noDataLabel: "I don't have soft skills to highlight",
    placeholder: 'Add your soft skills...',
    addLabel: 'Add Skill',
  },
  language_v1: {
    label: 'Languages',
    required: true,
    icon: '🌍',
    noDataLabel: "I don't have languages to add",
    placeholder: 'Add languages you speak...',
    addLabel: 'Add Language',
  },
  project_v1: {
    label: 'Projects',
    required: false,
    icon: '🚀',
    noDataLabel: "I don't have projects to showcase",
    placeholder: 'Add a project...',
    addLabel: 'Add Project',
  },
  certification_v1: {
    label: 'Certifications',
    required: false,
    icon: '📜',
    noDataLabel: "I don't have certifications",
    placeholder: 'Add a certification...',
    addLabel: 'Add Certification',
  },
  award_v1: {
    label: 'Awards',
    required: false,
    icon: '🏆',
    noDataLabel: "I don't have awards to mention",
    placeholder: 'Add an award...',
    addLabel: 'Add Award',
  },
  publication_v1: {
    label: 'Publications',
    required: false,
    icon: '📝',
    noDataLabel: "I don't have publications",
    placeholder: 'Add a publication...',
    addLabel: 'Add Publication',
  },
};
