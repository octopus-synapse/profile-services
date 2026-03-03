/**
 * Clean Architecture Test Constants
 *
 * Modules and services that MUST follow Clean Architecture.
 */

// Modules that MUST follow Clean Architecture
export const CLEAN_ARCHITECTURE_MODULES = [
  'resumes/resume-versions',
  'skills-catalog/skills',
  'identity/users',
];

// Services with Clean Architecture structure (use-cases subdirectory)
export const CLEAN_ARCHITECTURE_SERVICES = [
  'resumes/resume-versions/services/resume-version',
  'skills-catalog/skills/services/skill-management',
  'identity/users/services/user-management',
  'identity/users/services/user-preferences',
  'identity/users/services/username',
  'onboarding/onboarding/services/onboarding-progress',
  'onboarding/onboarding/onboarding',
];

// Bounded contexts in the system
export const BOUNDED_CONTEXTS = [
  'resumes',
  'identity',
  'skills-catalog',
  'presentation',
  'integration',
];
