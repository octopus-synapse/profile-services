/**
 * Theme Resource Permissions
 *
 * Atomic authorization units for theme management operations.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const THEME_PERMISSIONS: CreatePermissionInput[] = [
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
];
