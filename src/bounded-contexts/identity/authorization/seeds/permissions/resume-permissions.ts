/**
 * Resume Resource Permissions
 *
 * Atomic authorization units for resume management operations.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const RESUME_PERMISSIONS: CreatePermissionInput[] = [
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
];
