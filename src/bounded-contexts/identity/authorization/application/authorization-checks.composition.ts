/**
 * Authorization Checks Composition
 *
 * Wires all authorization check use cases with their dependencies.
 */

import type { AuthorizationCachePort } from '../domain/ports/authorization-cache.port';
import type { IGroupRepository, IRoleRepository } from '../domain/ports/authorization-repositories.port';
import { PermissionResolverService } from '../domain/services/permission-resolver.service';
import { InMemoryAuthorizationCache } from '../infrastructure/adapters/cache/authorization-cache.adapter';
import type { GroupRepository } from '../infrastructure/repositories/group.repository';
import type { PermissionRepository } from '../infrastructure/repositories/permission.repository';
import type { RoleRepository } from '../infrastructure/repositories/role.repository';
import type { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';
import {
  AUTHORIZATION_CHECK_USE_CASES,
  type AuthorizationCheckUseCases,
} from './ports/authorization-use-cases.port';
import { CheckAllPermissionsUseCase } from './use-cases/authorization-checks/check-all-permissions.use-case';
import { CheckAnyPermissionUseCase } from './use-cases/authorization-checks/check-any-permission.use-case';
import { CheckGroupMembershipUseCase } from './use-cases/authorization-checks/check-group-membership.use-case';
import { CheckLastAdminUseCase } from './use-cases/authorization-checks/check-last-admin.use-case';
import { CheckPermissionUseCase } from './use-cases/authorization-checks/check-permission.use-case';
import { CheckRoleUseCase } from './use-cases/authorization-checks/check-role.use-case';
import { CountUsersWithRoleUseCase } from './use-cases/authorization-checks/count-users-with-role.use-case';
import { GetAllPermissionsUseCase } from './use-cases/authorization-checks/get-all-permissions.use-case';
import { GetAuthContextUseCase } from './use-cases/authorization-checks/get-auth-context.use-case';
import { GetResourcePermissionsUseCase } from './use-cases/authorization-checks/get-resource-permissions.use-case';

export { AUTHORIZATION_CHECK_USE_CASES };

export function buildAuthorizationCheckUseCases(
  permissionRepo: PermissionRepository,
  roleRepo: RoleRepository,
  groupRepo: GroupRepository,
  userAuthRepo: UserAuthorizationRepository,
): AuthorizationCheckUseCases {
  const resolver = new PermissionResolverService(
    permissionRepo,
    roleRepo,
    groupRepo,
    userAuthRepo,
  );

  const cache: AuthorizationCachePort = new InMemoryAuthorizationCache();

  const getAuthContextUseCase = new GetAuthContextUseCase(resolver, cache);
  const checkPermissionUseCase = new CheckPermissionUseCase(getAuthContextUseCase);
  const checkAnyPermissionUseCase = new CheckAnyPermissionUseCase(getAuthContextUseCase);
  const checkAllPermissionsUseCase = new CheckAllPermissionsUseCase(getAuthContextUseCase);
  const getResourcePermissionsUseCase = new GetResourcePermissionsUseCase(getAuthContextUseCase);
  const getAllPermissionsUseCase = new GetAllPermissionsUseCase(getAuthContextUseCase);
  const checkRoleUseCase = new CheckRoleUseCase(getAuthContextUseCase, roleRepo as IRoleRepository);
  const checkGroupMembershipUseCase = new CheckGroupMembershipUseCase(
    getAuthContextUseCase,
    groupRepo as IGroupRepository,
  );
  const countUsersWithRoleUseCase = new CountUsersWithRoleUseCase(userAuthRepo);
  const checkLastAdminUseCase = new CheckLastAdminUseCase(checkRoleUseCase, countUsersWithRoleUseCase);

  return {
    getAuthContextUseCase,
    checkPermissionUseCase,
    checkAnyPermissionUseCase,
    checkAllPermissionsUseCase,
    getResourcePermissionsUseCase,
    getAllPermissionsUseCase,
    checkRoleUseCase,
    checkGroupMembershipUseCase,
    countUsersWithRoleUseCase,
    checkLastAdminUseCase,
    invalidateCache: (userId) => cache.invalidate(userId),
    invalidateAllCaches: () => cache.invalidateAll(),
    getCacheStats: () => cache.getStats(),
  };
}
