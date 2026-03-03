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
  'identity/auth',
];

// Services with Clean Architecture structure (use-cases subdirectory)
export const CLEAN_ARCHITECTURE_SERVICES = [
  'resumes/resume-versions/services/resume-version',
  'skills-catalog/skills/services/skill-management',
  'identity/users/services/user-management',
  'identity/users/services/user-preferences',
  'identity/users/services/username',
  'identity/auth/services/password-reset',
  'identity/auth/services/email-verification',
  'identity/auth/services/gdpr-deletion',
  'identity/auth/services/account-management',
];

// Bounded contexts in the system
export const BOUNDED_CONTEXTS = [
  'resumes',
  'identity',
  'skills-catalog',
  'presentation',
  'integration',
];
