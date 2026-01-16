/**
 * Authorization Seed Data
 *
 * Defines the default permissions, roles, and groups for the system.
 * This data is used to seed the database during setup.
 *
 * Design Principles:
 * - System roles/permissions are marked as isSystem (cannot be deleted)
 * - Follows principle of least privilege
 * - Maps existing UserRole enum to new system for backward compatibility
 */

import type { CreatePermissionInput } from '../domain/entities/permission.entity';
import type { CreateRoleInput } from '../domain/entities/role.entity';
import type { CreateGroupInput } from '../domain/entities/group.entity';

// ============================================================================
// Permissions
// ============================================================================

/**
 * System permissions - these are the atomic authorization units
 */
export const SYSTEM_PERMISSIONS: CreatePermissionInput[] = [
  // User management
  {
    resource: 'user',
    action: 'create',
    description: 'Create new users',
    isSystem: true,
  },
  {
    resource: 'user',
    action: 'read',
    description: 'View user profiles',
    isSystem: true,
  },
  {
    resource: 'user',
    action: 'update',
    description: 'Update user profiles',
    isSystem: true,
  },
  {
    resource: 'user',
    action: 'delete',
    description: 'Delete users',
    isSystem: true,
  },
  {
    resource: 'user',
    action: 'list',
    description: 'List all users',
    isSystem: true,
  },
  {
    resource: 'user',
    action: 'manage',
    description: 'Full control over users',
    isSystem: true,
  },

  // Resume management
  {
    resource: 'resume',
    action: 'create',
    description: 'Create resumes',
    isSystem: true,
  },
  {
    resource: 'resume',
    action: 'read',
    description: 'View resumes',
    isSystem: true,
  },
  {
    resource: 'resume',
    action: 'update',
    description: 'Update resumes',
    isSystem: true,
  },
  {
    resource: 'resume',
    action: 'delete',
    description: 'Delete resumes',
    isSystem: true,
  },
  {
    resource: 'resume',
    action: 'list',
    description: 'List resumes',
    isSystem: true,
  },
  {
    resource: 'resume',
    action: 'export',
    description: 'Export resumes',
    isSystem: true,
  },
  {
    resource: 'resume',
    action: 'share',
    description: 'Share resumes',
    isSystem: true,
  },
  {
    resource: 'resume',
    action: 'manage',
    description: 'Full control over resumes',
    isSystem: true,
  },

  // Theme management
  {
    resource: 'theme',
    action: 'create',
    description: 'Create themes',
    isSystem: true,
  },
  {
    resource: 'theme',
    action: 'read',
    description: 'View themes',
    isSystem: true,
  },
  {
    resource: 'theme',
    action: 'update',
    description: 'Update themes',
    isSystem: true,
  },
  {
    resource: 'theme',
    action: 'delete',
    description: 'Delete themes',
    isSystem: true,
  },
  {
    resource: 'theme',
    action: 'list',
    description: 'List themes',
    isSystem: true,
  },
  {
    resource: 'theme',
    action: 'approve',
    description: 'Approve pending themes',
    isSystem: true,
  },
  {
    resource: 'theme',
    action: 'reject',
    description: 'Reject pending themes',
    isSystem: true,
  },
  {
    resource: 'theme',
    action: 'manage',
    description: 'Full control over themes',
    isSystem: true,
  },

  // Skill management
  {
    resource: 'skill',
    action: 'create',
    description: 'Create skills',
    isSystem: true,
  },
  {
    resource: 'skill',
    action: 'read',
    description: 'View skills',
    isSystem: true,
  },
  {
    resource: 'skill',
    action: 'update',
    description: 'Update skills',
    isSystem: true,
  },
  {
    resource: 'skill',
    action: 'delete',
    description: 'Delete skills',
    isSystem: true,
  },
  {
    resource: 'skill',
    action: 'list',
    description: 'List skills',
    isSystem: true,
  },
  {
    resource: 'skill',
    action: 'manage',
    description: 'Full control over skills',
    isSystem: true,
  },

  // Authorization management (admin only)
  {
    resource: 'role',
    action: 'create',
    description: 'Create roles',
    isSystem: true,
  },
  {
    resource: 'role',
    action: 'read',
    description: 'View roles',
    isSystem: true,
  },
  {
    resource: 'role',
    action: 'update',
    description: 'Update roles',
    isSystem: true,
  },
  {
    resource: 'role',
    action: 'delete',
    description: 'Delete roles',
    isSystem: true,
  },
  {
    resource: 'role',
    action: 'list',
    description: 'List roles',
    isSystem: true,
  },
  {
    resource: 'role',
    action: 'manage',
    description: 'Full control over roles',
    isSystem: true,
  },

  {
    resource: 'group',
    action: 'create',
    description: 'Create groups',
    isSystem: true,
  },
  {
    resource: 'group',
    action: 'read',
    description: 'View groups',
    isSystem: true,
  },
  {
    resource: 'group',
    action: 'update',
    description: 'Update groups',
    isSystem: true,
  },
  {
    resource: 'group',
    action: 'delete',
    description: 'Delete groups',
    isSystem: true,
  },
  {
    resource: 'group',
    action: 'list',
    description: 'List groups',
    isSystem: true,
  },
  {
    resource: 'group',
    action: 'manage',
    description: 'Full control over groups',
    isSystem: true,
  },

  {
    resource: 'permission',
    action: 'read',
    description: 'View permissions',
    isSystem: true,
  },
  {
    resource: 'permission',
    action: 'list',
    description: 'List permissions',
    isSystem: true,
  },

  // Audit log
  {
    resource: 'audit_log',
    action: 'read',
    description: 'View audit logs',
    isSystem: true,
  },
  {
    resource: 'audit_log',
    action: 'list',
    description: 'List audit logs',
    isSystem: true,
  },

  // Analytics
  {
    resource: 'analytics',
    action: 'read',
    description: 'View analytics',
    isSystem: true,
  },

  // Platform stats
  {
    resource: 'stats',
    action: 'read',
    description: 'View platform statistics',
    isSystem: true,
  },
  {
    resource: 'stats',
    action: 'manage',
    description: 'Full control over platform statistics',
    isSystem: true,
  },

  // Settings
  {
    resource: 'settings',
    action: 'read',
    description: 'View system settings',
    isSystem: true,
  },
  {
    resource: 'settings',
    action: 'update',
    description: 'Update system settings',
    isSystem: true,
  },
  {
    resource: 'settings',
    action: 'manage',
    description: 'Full control over settings',
    isSystem: true,
  },

  // Collaboration
  {
    resource: 'collaboration',
    action: 'create',
    description: 'Create collaborations',
    isSystem: true,
  },
  {
    resource: 'collaboration',
    action: 'read',
    description: 'View collaborations',
    isSystem: true,
  },
  {
    resource: 'collaboration',
    action: 'update',
    description: 'Update collaborations',
    isSystem: true,
  },
  {
    resource: 'collaboration',
    action: 'delete',
    description: 'Delete collaborations',
    isSystem: true,
  },
  {
    resource: 'collaboration',
    action: 'manage',
    description: 'Full control over collaborations',
    isSystem: true,
  },

  // Super admin (all resources)
  {
    resource: '*',
    action: 'manage',
    description: 'Super admin - full system access',
    isSystem: true,
  },
];

// ============================================================================
// Roles
// ============================================================================

/**
 * Role definitions with their permission assignments
 */
export interface RoleDefinition extends CreateRoleInput {
  permissions: string[]; // "resource:action" format
}

export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    isSystem: true,
    priority: 100,
    permissions: ['*:manage'],
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access to manage users and content',
    isSystem: true,
    priority: 90,
    permissions: [
      'user:manage',
      'resume:manage',
      'theme:manage',
      'skill:manage',
      'role:read',
      'role:list',
      'group:read',
      'group:list',
      'permission:read',
      'permission:list',
      'audit_log:read',
      'audit_log:list',
      'analytics:read',
      'settings:manage',
    ],
  },
  {
    name: 'approver',
    displayName: 'Content Approver',
    description: 'Can approve or reject user-submitted content',
    isSystem: true,
    priority: 50,
    permissions: ['theme:read', 'theme:list', 'theme:approve', 'theme:reject'],
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
      'resume:share',
      'theme:read',
      'theme:list',
      'theme:create', // Can create custom themes
      'skill:read',
      'skill:list',
      'collaboration:create',
      'collaboration:read',
      'collaboration:update',
      'collaboration:delete',
    ],
  },
];

// ============================================================================
// Groups
// ============================================================================

/**
 * Group definitions with their role assignments
 */
export interface GroupDefinition extends CreateGroupInput {
  roles: string[]; // Role names
  permissions?: string[]; // Direct permissions ("resource:action" format)
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
];

// ============================================================================
// Legacy Role Mapping
// ============================================================================

/**
 * Maps the old UserRole enum to the new role names
 * Used during migration and backward compatibility
 */
export const LEGACY_ROLE_MAPPING: Record<string, string> = {
  ADMIN: 'admin',
  APPROVER: 'approver',
  USER: 'user',
};
