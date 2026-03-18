/**
 * Section Types Resource Permissions
 *
 * Atomic authorization units for section types management operations.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const SECTION_TYPE_PERMISSIONS: CreatePermissionInput[] = [
  {
    resource: 'section_types',
    action: 'create',
    description: 'Create section types',
    isSystem: true,
  },
  {
    resource: 'section_types',
    action: 'read',
    description: 'View section types',
    isSystem: true,
  },
  {
    resource: 'section_types',
    action: 'update',
    description: 'Update section types',
    isSystem: true,
  },
  {
    resource: 'section_types',
    action: 'delete',
    description: 'Delete section types',
    isSystem: true,
  },
  {
    resource: 'section_types',
    action: 'list',
    description: 'List section types',
    isSystem: true,
  },
  {
    resource: 'section_types',
    action: 'manage',
    description: 'Full control over section types',
    isSystem: true,
  },
];
