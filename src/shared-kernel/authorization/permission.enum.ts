/**
 * Permission Enum
 *
 * Single source of truth for all permissions in the system.
 * Format: RESOURCE_ACTION (e.g., RESUME_CREATE)
 *
 * Business Rules:
 * - 2 roles: role_user (default) and role_admin
 * - Control is per-PERMISSION, not per-role
 * - Users access: own resumes + shared + public resumes
 * - Admins have full access to everything
 */
export enum Permission {
  // ============================================================================
  // Resume (own resources)
  // ============================================================================
  RESUME_CREATE = 'resume:create',
  RESUME_READ = 'resume:read',
  RESUME_UPDATE = 'resume:update',
  RESUME_DELETE = 'resume:delete',
  RESUME_EXPORT = 'resume:export',
  RESUME_IMPORT = 'resume:import',
  RESUME_SHARE = 'resume:share',

  // ============================================================================
  // Resume Management (admin - any resume)
  // ============================================================================
  RESUME_MANAGE = 'resume:manage',

  // ============================================================================
  // User Profile (self)
  // ============================================================================
  USER_PROFILE_READ = 'user:profile_read',
  USER_PROFILE_UPDATE = 'user:profile_update',

  // ============================================================================
  // User Management (admin)
  // ============================================================================
  USER_MANAGE = 'user:manage',
  USER_ROLE_ASSIGN = 'user:role_assign',

  // ============================================================================
  // Theme (admin only)
  // ============================================================================
  THEME_READ = 'theme:read',
  THEME_CREATE = 'theme:create',
  THEME_UPDATE = 'theme:update',
  THEME_DELETE = 'theme:delete',

  // ============================================================================
  // Analytics
  // ============================================================================
  ANALYTICS_READ_OWN = 'analytics:read_own',
  ANALYTICS_READ_ALL = 'analytics:read_all',

  // ============================================================================
  // Skills Catalog
  // ============================================================================
  SKILL_READ = 'skill:read',
  SKILL_MANAGE = 'skill:manage',

  // ============================================================================
  // Section Types
  // ============================================================================
  SECTION_TYPE_READ = 'section_type:read',
  SECTION_TYPE_MANAGE = 'section_type:manage',

  // ============================================================================
  // Collaboration / Chat
  // ============================================================================
  COLLABORATION_USE = 'collaboration:use',
  CHAT_USE = 'chat:use',

  // ============================================================================
  // Social (Follow, Feed)
  // ============================================================================
  SOCIAL_USE = 'social:use',

  // ============================================================================
  // Platform (admin)
  // ============================================================================
  PLATFORM_STATS_READ = 'platform:stats_read',
  PLATFORM_MANAGE = 'platform:manage',

  // ============================================================================
  // Super Admin (bypass all checks)
  // ============================================================================
  ADMIN_FULL_ACCESS = 'admin:full_access',
}
