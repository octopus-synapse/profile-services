/**
 * Seeds Barrel Export
 *
 * Authorization seed data decomposed by resource domain.
 */

// Permissions (decomposed by resource)
export { SYSTEM_PERMISSIONS } from './permissions';
export * from './permissions';

// Roles
export { SYSTEM_ROLES } from './system-roles';
export type { RoleDefinition } from './system-roles';

// Groups
export { SYSTEM_GROUPS } from './system-groups';
export type { GroupDefinition } from './system-groups';

// Legacy mapping
export { LEGACY_ROLE_MAPPING, resolveLegacyRole } from './legacy-role-mapping';

// Seed runner
export * from './seed-runner';
