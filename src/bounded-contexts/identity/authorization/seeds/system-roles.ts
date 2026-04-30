/**
 * System Roles Definitions
 *
 * Role definitions with their permission assignments.
 * Roles aggregate permissions into named bundles.
 */

import type { CreateRoleInput } from '../domain/entities/role.entity';

/**
 * Role definition with permission assignments
 */
export interface RoleDefinition extends CreateRoleInput {
  /** Permissions in "resource:action" format */ permissions: string[];
}

export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access — receives every Permission via auto-grant.',
    isSystem: true,
    priority: 90,
    // Permissions auto-granted from `Object.values(Permission)` by seedRoles.
    permissions: [],
  },
  {
    name: 'user',
    displayName: 'Standard User',
    description: 'Basic user with access to own resources',
    isSystem: true,
    priority: 10,
    permissions: [
      'resume:create',
      'resume:read',
      'resume:update',
      'resume:delete',
      'resume:list',
      'resume:export',
      'resume:import',
      'resume:share',
      'theme:read',
      'theme:list',
      'theme:create',
      'skill:read',
      'skill:list',
      'collaboration:create',
      'collaboration:read',
      'collaboration:update',
      'collaboration:delete',
      'collaboration:use',
      'chat:use',
      'social:use',
      'feed:use',
      'notification:read',
      'analytics:read_own',
      'section_type:read',
      'section_type:list',
      'user:profile_read',
      'user:profile_update',
    ],
  },
  // Marker role: only regular end-users get this. Admins/super_admins do not.
  // Used by the scoring + onboarding gates to know "this account is a
  // job-seeker and must respect the invariants (onboarding, fit-profile,
  // resume quality)". The plain `user` role below is also assigned to admins
  // for basic resource permissions, so we cannot use it as the gate.
  {
    name: 'user_standard',
    displayName: 'Standard User (job seeker)',
    description:
      'Marker role for job-seeker accounts. Required for onboarding, fit-profile and match gates.',
    isSystem: true,
    priority: 9,
    permissions: [],
  },
];
