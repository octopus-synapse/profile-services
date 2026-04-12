/**
 * Authorization Management Composition
 *
 * Wires all authorization management use cases with their dependencies.
 */

import type { EventPublisherPort } from '@/shared-kernel';
import type { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';
import {
  AUTHORIZATION_MANAGEMENT_USE_CASES,
  type AuthorizationManagementUseCases,
} from './ports/authorization-use-cases.port';
import { AddToGroupUseCase } from './use-cases/authorization-management/add-to-group.use-case';
import { AssignRoleUseCase } from './use-cases/authorization-management/assign-role.use-case';
import { DenyPermissionUseCase } from './use-cases/authorization-management/deny-permission.use-case';
import { GrantPermissionUseCase } from './use-cases/authorization-management/grant-permission.use-case';
import { RemoveFromGroupUseCase } from './use-cases/authorization-management/remove-from-group.use-case';
import { RevokeRoleUseCase } from './use-cases/authorization-management/revoke-role.use-case';

export { AUTHORIZATION_MANAGEMENT_USE_CASES };

export function buildAuthorizationManagementUseCases(
  userAuthRepo: UserAuthorizationRepository,
  eventPublisher: EventPublisherPort,
): AuthorizationManagementUseCases {
  const assignRoleUseCase = new AssignRoleUseCase(userAuthRepo, eventPublisher);
  const revokeRoleUseCase = new RevokeRoleUseCase(userAuthRepo, eventPublisher);
  const grantPermissionUseCase = new GrantPermissionUseCase(userAuthRepo, eventPublisher);
  const denyPermissionUseCase = new DenyPermissionUseCase(userAuthRepo, eventPublisher);
  const addToGroupUseCase = new AddToGroupUseCase(userAuthRepo, eventPublisher);
  const removeFromGroupUseCase = new RemoveFromGroupUseCase(userAuthRepo, eventPublisher);

  return {
    assignRoleUseCase,
    revokeRoleUseCase,
    grantPermissionUseCase,
    denyPermissionUseCase,
    addToGroupUseCase,
    removeFromGroupUseCase,
  };
}
