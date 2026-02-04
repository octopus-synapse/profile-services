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
  /** Permissions in "resource:action" format */
  permissions: string[];
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
      'theme:create',
      'skill:read',
      'skill:list',
      'collaboration:create',
      'collaboration:read',
      'collaboration:update',
      'collaboration:delete',
    ],
  },
];
