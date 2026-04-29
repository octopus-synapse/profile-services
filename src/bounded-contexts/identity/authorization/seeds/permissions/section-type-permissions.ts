/**
 * Section Types Resource Permissions
 *
 * Atomic authorization units for section types management operations.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const SECTION_TYPE_PERMISSIONS: CreatePermissionInput[] = [
  {
    resource: 'section_type',
    action: 'create',
    description: 'Create section types',
    isSystem: true,
  },
  { resource: 'section_type', action: 'read', description: 'View section types', isSystem: true },
  {
    resource: 'section_type',
    action: 'update',
    description: 'Update section types',
    isSystem: true,
  },
  {
    resource: 'section_type',
    action: 'delete',
    description: 'Delete section types',
    isSystem: true,
  },
  { resource: 'section_type', action: 'list', description: 'List section types', isSystem: true },
  {
    resource: 'section_type',
    action: 'manage',
    description: 'Full control over section types',
    isSystem: true,
  },
];
