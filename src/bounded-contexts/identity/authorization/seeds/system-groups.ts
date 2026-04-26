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

export const SYSTEM_GROUPS: GroupDefinition[] = [
  {
    name: 'administrators',
    displayName: 'Administrators',
    description: 'System administrators group',
    isSystem: true,
    roles: ['admin'],
  },
  {
    name: 'content_team',
    displayName: 'Content Team',
    description: 'Team responsible for content moderation and approval',
    isSystem: true,
    roles: ['approver'],
  },
  {
    name: 'users',
    displayName: 'All Users',
    description: 'Default group for all registered users',
    isSystem: true,
    roles: ['user'],
  },
  // Job-seeker cohort. The `user_standard` role is a marker that gates the
  // onboarding + fit-profile + match invariants. Admins join `administrators`
  // and never get this, so their accounts bypass those gates.
  {
    name: 'job_seekers',
    displayName: 'Job Seekers',
    description: 'Regular end-user accounts (candidates). Gated by onboarding + fit-profile.',
    isSystem: true,
    roles: ['user', 'user_standard'],
  },
];
