/**
 * Resume With Relations
 *
 * Generic resume representation using canonical section model.
 * No legacy bucket arrays - all data comes from generic sections.
 */

import type { GenericResume, GenericResumeSection, SemanticKind } from '@/shared-kernel/types';

/**
 * Re-export generic types for backward compatibility of imports.
 */
export type { GenericResume, GenericResumeSection, SemanticKind };

/**
 * Resume with generic sections - the canonical representation.
 * Alias for GenericResume to maintain import paths during migration.
 */
export type ResumeWithRelations = GenericResume;

/**
 * User info embedded in resume context.
 */
export interface ResumeUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Extended resume with user info for contexts that need it.
 */
export interface ResumeWithUser extends GenericResume {
  user: ResumeUser;
}
