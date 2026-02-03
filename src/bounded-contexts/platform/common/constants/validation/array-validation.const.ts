/**
 * Array Validation Constants
 *
 * Maximum limits for array fields to prevent abuse.
 */
export const ARRAY_LIMIT = {
  MAX: {
    SKILLS_PER_CATEGORY: 20,
    SKILL_CATEGORIES: 10,
    EXPERIENCES: 15,
    EDUCATION: 10,
    PROJECTS: 20,
    CERTIFICATIONS: 20,
    LANGUAGES: 10,
    AWARDS: 10,
    RECOMMENDATIONS: 10,
  },
} as const;
