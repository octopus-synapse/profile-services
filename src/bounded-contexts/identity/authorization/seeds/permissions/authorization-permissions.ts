/**
 * Authorization Resource Permissions
 *
 * Atomic authorization units for role, group, and permission management.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const ROLE_PERMISSIONS: CreatePermissionInput[] = [
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
];

export const GROUP_PERMISSIONS: CreatePermissionInput[] = [
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
];

export const PERMISSION_PERMISSIONS: CreatePermissionInput[] = [
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
];
