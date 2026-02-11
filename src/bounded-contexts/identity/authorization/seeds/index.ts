/**
 * Seeds Barrel Export
 *
 * Authorization seed data decomposed by resource domain.
 */

// Legacy mapping
export { LEGACY_ROLE_MAPPING, resolveLegacyRole } from './legacy-role-mapping';
export * from './permissions';
// Permissions (decomposed by resource)
export { SYSTEM_PERMISSIONS } from './permissions';
// Seed runner
export * from './seed-runner';
export type { GroupDefinition } from './system-groups';
// Groups
export { SYSTEM_GROUPS } from './system-groups';
export type { RoleDefinition } from './system-roles';
// Roles
export { SYSTEM_ROLES } from './system-roles';
