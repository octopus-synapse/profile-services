/**
 * Roles
 *
 * Roles are named collections of permission groups.
 * Users have roles (stored as string[] in User.roles).
 * Permissions are resolved at runtime from roles → groups → permissions.
 *
 * Business Context:
 * - role_user: Default for all authenticated users
 * - role_admin: Full administrative access
 */
import type { PermissionGroupId } from './permission-groups';

export interface Role {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly groups: readonly PermissionGroupId[];
  readonly isSystem: boolean;
}

export const ROLES = {
  // ============================================================================
  // Standard User
  // ============================================================================
  USER: {
    id: 'role_user',
    displayName: 'User',
    description: 'Standard user with access to own resources',
    groups: [
      'grp_resume_owner',
      'grp_user_profile',
      'grp_analytics_own',
      'grp_catalog_reader',
      'grp_collaborator',
      'grp_social',
    ],
    isSystem: true,
  },

  // ============================================================================
  // Administrator
  // ============================================================================
  ADMIN: {
    id: 'role_admin',
    displayName: 'Administrator',
    description: 'Full administrative access to the platform',
    groups: [
      // All user permissions
      'grp_resume_owner',
      'grp_user_profile',
      'grp_analytics_own',
      'grp_catalog_reader',
      'grp_collaborator',
      'grp_social',
      // Admin permissions
      'grp_resume_admin',
      'grp_user_admin',
      'grp_theme_admin',
      'grp_catalog_admin',
      'grp_analytics_admin',
      'grp_platform_admin',
      'grp_super_admin',
    ],
    isSystem: true,
  },
} as const satisfies Record<string, Role>;

export type RoleId = (typeof ROLES)[keyof typeof ROLES]['id'];

/**
 * Get all available role IDs
 */
export function getAllRoleIds(): RoleId[] {
  return Object.values(ROLES).map((r) => r.id);
}

/**
 * Validate if a role ID exists
 */
export function isValidRoleId(roleId: string): roleId is RoleId {
  return Object.values(ROLES).some((r) => r.id === roleId);
}

/**
 * Get role by ID
 */
export function getRoleById(roleId: string): Role | undefined {
  return Object.values(ROLES).find((r) => r.id === roleId);
}
