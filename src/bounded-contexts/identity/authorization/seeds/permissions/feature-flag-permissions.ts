import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

export const FEATURE_FLAG_PERMISSIONS: CreatePermissionInput[] = [
  {
    resource: 'feature_flag',
    action: 'read',
    description: 'View feature flags and their state',
    isSystem: true,
  },
  {
    resource: 'feature_flag',
    action: 'manage',
    description: 'Toggle feature flags and broadcast refresh to clients',
    isSystem: true,
  },
];
