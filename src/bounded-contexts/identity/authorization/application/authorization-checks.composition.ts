/**
 * Authorization Checks Composition
 *
 * Wires all authorization check use cases with their dependencies.
 *
 * P0-009: Group hierarchy removed (legacy `Group/UserGroup` tables
 * dropped by the `20260430040810_authz_refactor` migration).
 * `CheckGroupMembershipUseCase` and `GroupRepository` were deleted
 * along with the schema. Per-user grants/suspensions now flow through
 * `AccessModifier` (consulted by the permission gate stage).
 */

import type { LoggerPort } from '@/shared-kernel';
import type { AuthorizationCachePort } from '../domain/ports/authorization-cache.port';
import type { IRoleRepository } from '../domain/ports/authorization-repositories.port';
import { PermissionResolverService } from '../domain/services/permission-resolver.service';
import { InMemoryAuthorizationCache } from '../infrastructure/adapters/cache/authorization-cache.adapter';
import type { PermissionRepository } from '../infrastructure/repositories/permission.repository';
import type { RoleRepository } from '../infrastructure/repositories/role.repository';
import type { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';
import { AuthorizationCheckUseCases } from './ports/authorization-use-cases.port';
import { CheckAllPermissionsUseCase } from './use-cases/authorization-checks/check-all-permissions.use-case';
import { CheckAnyPermissionUseCase } from './use-cases/authorization-checks/check-any-permission.use-case';
import { CheckLastAdminUseCase } from './use-cases/authorization-checks/check-last-admin.use-case';
import { CheckPermissionUseCase } from './use-cases/authorization-checks/check-permission.use-case';
import { CheckRoleUseCase } from './use-cases/authorization-checks/check-role.use-case';
import { CountUsersWithRoleUseCase } from './use-cases/authorization-checks/count-users-with-role.use-case';
import { GetAllPermissionsUseCase } from './use-cases/authorization-checks/get-all-permissions.use-case';
import { GetAuthContextUseCase } from './use-cases/authorization-checks/get-auth-context.use-case';
import { GetResourcePermissionsUseCase } from './use-cases/authorization-checks/get-resource-permissions.use-case';

export { AuthorizationCheckUseCases };

export function buildAuthorizationCheckUseCases(
  permissionRepo: PermissionRepository,
  roleRepo: RoleRepository,
  userAuthRepo: UserAuthorizationRepository,
  logger: LoggerPort,
): AuthorizationCheckUseCases {
  const resolver = new PermissionResolverService(permissionRepo, roleRepo, userAuthRepo);

  const cache: AuthorizationCachePort = new InMemoryAuthorizationCache();

  const getAuthContextUseCase = new GetAuthContextUseCase(resolver, cache, logger);
  const checkPermissionUseCase = new CheckPermissionUseCase(getAuthContextUseCase);
  const checkAnyPermissionUseCase = new CheckAnyPermissionUseCase(getAuthContextUseCase);
  const checkAllPermissionsUseCase = new CheckAllPermissionsUseCase(getAuthContextUseCase);
  const getResourcePermissionsUseCase = new GetResourcePermissionsUseCase(getAuthContextUseCase);
  const getAllPermissionsUseCase = new GetAllPermissionsUseCase(getAuthContextUseCase);
  const checkRoleUseCase = new CheckRoleUseCase(
    getAuthContextUseCase,
    roleRepo as IRoleRepository,
    logger,
  );
  const countUsersWithRoleUseCase = new CountUsersWithRoleUseCase(userAuthRepo);
  const checkLastAdminUseCase = new CheckLastAdminUseCase(
    checkRoleUseCase,
    countUsersWithRoleUseCase,
    logger,
  );

  return {
    getAuthContextUseCase,
    checkPermissionUseCase,
    checkAnyPermissionUseCase,
    checkAllPermissionsUseCase,
    getResourcePermissionsUseCase,
    getAllPermissionsUseCase,
    checkRoleUseCase,
    countUsersWithRoleUseCase,
    checkLastAdminUseCase,
    invalidateCache: (userId) => cache.invalidate(userId),
    invalidateAllCaches: () => cache.invalidateAll(),
    getCacheStats: () => cache.getStats(),
  };
}
