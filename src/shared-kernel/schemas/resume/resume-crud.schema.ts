/**
 * Resume DTOs
 *
 * Data Transfer Objects for resume operations.
 *
 * IMPORTANT: This file RE-EXPORTS schemas from the domain layer.
 * Single source of truth is in domain/schemas/resume/
 *
 * Clean Architecture: Application layer depends on Domain layer
 */

// ============================================================================
// RE-EXPORTS FROM DOMAIN LAYER
// ============================================================================
// These DTOs are defined ONCE in the domain layer.
// Application layer re-exports them to maintain the contract API.

// Resume (aggregate)
export {
  type CreateResume,
  type CreateResumeData,
  CreateResumeSchema,
  RESUME_RELATION_KEYS,
  type ResumeRelationKey,
  type UpdateResume,
  type UpdateResumeData,
  UpdateResumeSchema,
} from '../../schemas/resume/resume.schema';
