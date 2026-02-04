/**
 * System-wide Resource Permissions
 *
 * Atomic authorization units for audit logs, analytics, stats, settings,
 * collaboration, and super admin access.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const AUDIT_LOG_PERMISSIONS: CreatePermissionInput[] = [
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
];

export const ANALYTICS_PERMISSIONS: CreatePermissionInput[] = [
  {
    resource: 'analytics',
    action: 'read',
    description: 'View analytics',
    isSystem: true,
  },
];

export const STATS_PERMISSIONS: CreatePermissionInput[] = [
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
];

export const SETTINGS_PERMISSIONS: CreatePermissionInput[] = [
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
];

export const COLLABORATION_PERMISSIONS: CreatePermissionInput[] = [
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
];

export const SUPER_ADMIN_PERMISSIONS: CreatePermissionInput[] = [
  {
    resource: '*',
    action: 'manage',
    description: 'Super admin - full system access',
    isSystem: true,
  },
];
