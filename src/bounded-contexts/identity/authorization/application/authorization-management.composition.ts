/**
 * Authorization Management Composition
 *
 * Wires all authorization management use cases with their dependencies.
 */

import { EventPublisherPort, LoggerPort } from '@/shared-kernel';
import type { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';
import { AuthorizationManagementUseCases } from './ports/authorization-use-cases.port';
import { AddToGroupUseCase } from './use-cases/authorization-management/add-to-group.use-case';
import { AssignRoleUseCase } from './use-cases/authorization-management/assign-role.use-case';
import { DenyPermissionUseCase } from './use-cases/authorization-management/deny-permission.use-case';
import { GrantPermissionUseCase } from './use-cases/authorization-management/grant-permission.use-case';
import { RemoveFromGroupUseCase } from './use-cases/authorization-management/remove-from-group.use-case';
import { RevokeRoleUseCase } from './use-cases/authorization-management/revoke-role.use-case';

export { AuthorizationManagementUseCases };

export function buildAuthorizationManagementUseCases(
  userAuthRepo: UserAuthorizationRepository,
  eventPublisher: EventPublisherPort,
  logger: LoggerPort,
): AuthorizationManagementUseCases {
  const assignRoleUseCase = new AssignRoleUseCase(userAuthRepo, eventPublisher, logger);
  const revokeRoleUseCase = new RevokeRoleUseCase(userAuthRepo, eventPublisher, logger);
  const grantPermissionUseCase = new GrantPermissionUseCase(userAuthRepo, eventPublisher, logger);
  const denyPermissionUseCase = new DenyPermissionUseCase(userAuthRepo, eventPublisher, logger);
  const addToGroupUseCase = new AddToGroupUseCase(userAuthRepo, eventPublisher, logger);
  const removeFromGroupUseCase = new RemoveFromGroupUseCase(userAuthRepo, eventPublisher, logger);

  return {
    assignRoleUseCase,
    revokeRoleUseCase,
    grantPermissionUseCase,
    denyPermissionUseCase,
    addToGroupUseCase,
    removeFromGroupUseCase,
  };
}
