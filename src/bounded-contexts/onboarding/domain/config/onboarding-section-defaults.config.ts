/** Section step order — which sections to show in onboarding */
export const SECTION_ORDER_KEYS = [
  'work_experience_v1',
  'education_v1',
  'skill_set_v1',
  'language_v1',
] as const;

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
    label: 'Skills',
    required: true,
    icon: '⚡',
    noDataLabel: "I'm still developing my skills",
    placeholder: 'Add your skills...',
    addLabel: 'Add Skill',
  },
  language_v1: {
    label: 'Languages',
    required: false,
    icon: '🌍',
    noDataLabel: "I don't have languages to add",
    placeholder: 'Add languages you speak...',
    addLabel: 'Add Language',
  },
};
