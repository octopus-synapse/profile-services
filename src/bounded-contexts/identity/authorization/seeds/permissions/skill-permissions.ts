/**
 * Skill Resource Permissions
 *
 * Atomic authorization units for skill management operations.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const SKILL_PERMISSIONS: CreatePermissionInput[] = [
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
];
