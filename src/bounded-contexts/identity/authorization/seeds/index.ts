/**
 * Seeds Barrel Export
 *
 * Authorization seed data decomposed by resource domain.
 *
 * P0-009: `system-groups` was removed alongside the dropped Group
 * hierarchy. Permissions + roles remain.
 */

export * from './permissions';
// Permissions (decomposed by resource)
export { SYSTEM_PERMISSIONS } from './permissions';
// Seed runner
export * from './seed.runner';
export type { RoleDefinition } from './system-roles';
// Roles
export { SYSTEM_ROLES } from './system-roles';
