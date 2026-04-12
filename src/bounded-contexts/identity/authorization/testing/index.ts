/**
 * Authorization Testing Module
 *
 * In-memory implementations for testing authorization features:
 * - Permission repository
 * - Role repository
 * - Group repository (with hierarchy traversal)
 * - User authorization repository (read + write)
 * - Authorization cache
 */

export { InMemoryAuthorizationCache } from './in-memory-authorization-cache';
export { InMemoryGroupRepository } from './in-memory-group.repository';
export { InMemoryPermissionRepository } from './in-memory-permission.repository';
export { InMemoryRoleRepository } from './in-memory-role.repository';
export { InMemoryUserAuthorizationRepository } from './in-memory-user-authorization.repository';
