/**
 * System Groups Definitions
 *
 * Group definitions with their role assignments.
 * Groups aggregate roles for organizational structure.
 */

import type { CreateGroupInput } from '../domain/entities/group.entity';

/**
 * Group definition with role assignments
 */
export interface GroupDefinition extends CreateGroupInput {
  /** Role names assigned to this group */ roles: string[];
  /** Direct permissions in "resource:action" format */
  permissions?: string[];
}

// Groups are scheduled for removal in the auth refactor (see plan).
// Keeping the array empty preserves the seed pipeline shape without
// allocating any rows. Tables are dropped in a separate migration.
export const SYSTEM_GROUPS: GroupDefinition[] = [];
