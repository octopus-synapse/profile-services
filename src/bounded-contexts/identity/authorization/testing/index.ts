/**
 * Authorization Testing Module
 *
 * In-memory implementations for testing authorization features:
 * - Permission repository
 * - Role repository
 * - User authorization repository (read + write)
 * - Authorization cache
 *
 * P0-009: in-memory `Group` repository removed (legacy hierarchy
 * dropped by `20260430040810_authz_refactor`).
 */

export { InMemoryAuthorizationCache } from './in-memory-authorization-cache';
export { InMemoryPermissionRepository } from './in-memory-permission.repository';
export { InMemoryRoleRepository } from './in-memory-role.repository';
export { InMemoryUserAuthorizationRepository } from './in-memory-user-authorization.repository';
