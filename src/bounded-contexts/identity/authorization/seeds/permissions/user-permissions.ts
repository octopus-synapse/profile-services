/**
 * User Resource Permissions
 *
 * Atomic authorization units for user management operations.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const USER_PERMISSIONS: CreatePermissionInput[] = [
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
];
