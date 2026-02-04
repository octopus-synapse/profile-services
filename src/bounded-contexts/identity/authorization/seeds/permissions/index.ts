/**
 * Permissions Barrel Export
 *
 * Aggregates all resource-specific permissions into SYSTEM_PERMISSIONS.
 */

import type { CreatePermissionInput } from '../../domain/entities/permission.entity';

import { USER_PERMISSIONS } from './user-permissions';
import { RESUME_PERMISSIONS } from './resume-permissions';
import { THEME_PERMISSIONS } from './theme-permissions';
import { SKILL_PERMISSIONS } from './skill-permissions';
import {
  ROLE_PERMISSIONS,
  GROUP_PERMISSIONS,
  PERMISSION_PERMISSIONS,
} from './authorization-permissions';
import {
  AUDIT_LOG_PERMISSIONS,
  ANALYTICS_PERMISSIONS,
  STATS_PERMISSIONS,
  SETTINGS_PERMISSIONS,
  COLLABORATION_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
} from './system-permissions';

/**
 * All system permissions aggregated.
 * Order: user → resume → theme → skill → authorization → system
 */
export const SYSTEM_PERMISSIONS: CreatePermissionInput[] = [
  ...USER_PERMISSIONS,
  ...RESUME_PERMISSIONS,
  ...THEME_PERMISSIONS,
  ...SKILL_PERMISSIONS,
  ...ROLE_PERMISSIONS,
  ...GROUP_PERMISSIONS,
  ...PERMISSION_PERMISSIONS,
  ...AUDIT_LOG_PERMISSIONS,
  ...ANALYTICS_PERMISSIONS,
  ...STATS_PERMISSIONS,
  ...SETTINGS_PERMISSIONS,
  ...COLLABORATION_PERMISSIONS,
  ...SUPER_ADMIN_PERMISSIONS,
];

export {
  USER_PERMISSIONS,
  RESUME_PERMISSIONS,
  THEME_PERMISSIONS,
  SKILL_PERMISSIONS,
  ROLE_PERMISSIONS,
  GROUP_PERMISSIONS,
  PERMISSION_PERMISSIONS,
  AUDIT_LOG_PERMISSIONS,
  ANALYTICS_PERMISSIONS,
  STATS_PERMISSIONS,
  SETTINGS_PERMISSIONS,
  COLLABORATION_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
};
