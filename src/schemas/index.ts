/**
 * Centralized Validation Schemas Export
 * Single source of truth for all Zod schemas
 *
 * Benefits:
 * - DRY: Share schemas between frontend and backend
 * - Type Safety: Auto-generated TypeScript types
 * - Consistency: Same validation rules everywhere
 */

// Auth
export * from '../auth/schemas/auth.schemas';

// Users & Preferences
export * from '../users/schemas/user.schemas';

// Resumes
export * from '../resumes/schemas/resume.schemas';

// Onboarding
export * from '../onboarding/schemas/onboarding.schema';
