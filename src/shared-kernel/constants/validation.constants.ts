export const STRING_LIMITS = {
 EMAIL: { MAX: 255 },
 USERNAME: { MIN: 3, MAX: 30 },
 NAME: { MIN: 2, MAX: 100 },
 BIO: { MAX: 500 },
 TITLE: { MAX: 200 },
 SUMMARY: { MAX: 2000 },
 DESCRIPTION: { MIN: 10, MAX: 2000 },
 LONG_TEXT: { MAX: 5000 },
 URL: { MAX: 2048 },
 PASSWORD: { MIN: 8, MAX: 128 },
} as const;

export const ARRAY_LIMITS = {
 MAX_SKILLS: 100,
 MAX_SKILLS_PER_CATEGORY: 20,
 MAX_SKILL_CATEGORIES: 10,
 MAX_EXPERIENCES: 50,
 MAX_EDUCATIONS: 20,
 MAX_CERTIFICATIONS: 50,
 MAX_PROJECTS: 50,
 MAX_LANGUAGES: 10,
 MAX_AWARDS: 10,
 MAX_RECOMMENDATIONS: 10,
} as const;

export const DATE_LIMITS = {
 MIN_YEAR: 1950,
 MAX_YEAR: new Date().getFullYear() + 10,
} as const;

export const FILE_LIMITS = {
 MAX_SIZE_MB: 5,
 MAX_SIZE_BYTES: 5 * 1024 * 1024,
 ALLOWED_IMAGE_TYPES: [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
 ] as const,
 ALLOWED_DOCUMENT_TYPES: [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 ] as const,
} as const;

export const VALIDATION_PATTERNS = {
 USERNAME: /^[a-z0-9_-]+$/i,
 USERNAME_START: /^[a-z0-9]/,
 USERNAME_END: /[a-z0-9]$/,
 NO_CONSECUTIVE_UNDERSCORES: /^(?!.*__)/,
 PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
} as const;
