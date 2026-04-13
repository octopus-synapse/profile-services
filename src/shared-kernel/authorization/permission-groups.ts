/**
 * Permission Groups
 *
 * Logical groupings of permissions for easier role composition.
 * Groups represent capabilities, not roles.
 *
 * Business Context:
 * - Users can: manage own resumes, view shared/public, use social features
 * - Admins can: everything + manage themes, skills catalog, users
 */
import { Permission } from './permission.enum';

export interface PermissionGroup {
  readonly id: string;
  readonly displayName: string;
  readonly permissions: readonly Permission[];
}

export const PERMISSION_GROUPS = {
  // ============================================================================
  // Standard User Capabilities
  // ============================================================================

  // User can manage their own resumes
  RESUME_OWNER: {
    id: 'grp_resume_owner',
    displayName: 'Resume Owner',
    permissions: [
      Permission.RESUME_CREATE,
      Permission.RESUME_READ,
      Permission.RESUME_UPDATE,
      Permission.RESUME_DELETE,
      Permission.RESUME_EXPORT,
      Permission.RESUME_IMPORT,
      Permission.RESUME_SHARE,
    ],
  },

  // User can manage their own profile
  USER_PROFILE: {
    id: 'grp_user_profile',
    displayName: 'User Profile',
    permissions: [Permission.USER_PROFILE_READ, Permission.USER_PROFILE_UPDATE],
  },

  // User can view own analytics
  ANALYTICS_OWN: {
    id: 'grp_analytics_own',
    displayName: 'Own Analytics',
    permissions: [Permission.ANALYTICS_READ_OWN],
  },

  // User can read skills catalog and section types
  CATALOG_READER: {
    id: 'grp_catalog_reader',
    displayName: 'Catalog Reader',
    permissions: [Permission.SKILL_READ, Permission.SECTION_TYPE_READ, Permission.THEME_READ],
  },

  // User can use collaboration features
  COLLABORATOR: {
    id: 'grp_collaborator',
    displayName: 'Collaborator',
    permissions: [Permission.COLLABORATION_USE, Permission.CHAT_USE],
  },

  // User can use social features
  SOCIAL: {
    id: 'grp_social',
    displayName: 'Social',
    permissions: [Permission.SOCIAL_USE],
  },

  // User can use feed and jobs
  FEED_USER: {
    id: 'grp_feed_user',
    displayName: 'Feed User',
    permissions: [Permission.FEED_USE, Permission.JOB_CREATE, Permission.NOTIFICATION_READ],
  },

  // ============================================================================
  // Admin Capabilities
  // ============================================================================

  // Admin can manage all resumes
  RESUME_ADMIN: {
    id: 'grp_resume_admin',
    displayName: 'Resume Admin',
    permissions: [Permission.RESUME_MANAGE],
  },

  // Admin can manage users
  USER_ADMIN: {
    id: 'grp_user_admin',
    displayName: 'User Admin',
    permissions: [Permission.USER_MANAGE, Permission.USER_ROLE_ASSIGN],
  },

  // Admin can manage themes
  THEME_ADMIN: {
    id: 'grp_theme_admin',
    displayName: 'Theme Admin',
    permissions: [Permission.THEME_CREATE, Permission.THEME_UPDATE, Permission.THEME_DELETE],
  },

  // Admin can manage catalog (skills, section types)
  CATALOG_ADMIN: {
    id: 'grp_catalog_admin',
    displayName: 'Catalog Admin',
    permissions: [Permission.SKILL_MANAGE, Permission.SECTION_TYPE_MANAGE],
  },

  // Admin can view all analytics
  ANALYTICS_ADMIN: {
    id: 'grp_analytics_admin',
    displayName: 'Analytics Admin',
    permissions: [Permission.ANALYTICS_READ_ALL],
  },

  // Admin can manage platform
  PLATFORM_ADMIN: {
    id: 'grp_platform_admin',
    displayName: 'Platform Admin',
    permissions: [Permission.PLATFORM_STATS_READ, Permission.PLATFORM_MANAGE],
  },

  // Admin can moderate feed and manage jobs
  FEED_ADMIN: {
    id: 'grp_feed_admin',
    displayName: 'Feed Admin',
    permissions: [Permission.FEED_MODERATE, Permission.JOB_MANAGE],
  },

  // Super admin - bypass all
  SUPER_ADMIN: {
    id: 'grp_super_admin',
    displayName: 'Super Admin',
    permissions: [Permission.ADMIN_FULL_ACCESS],
  },
} as const satisfies Record<string, PermissionGroup>;

export type PermissionGroupId = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS]['id'];
