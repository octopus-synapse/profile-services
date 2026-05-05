/**
 * Authorization Management Composition
 *
 * Wires all authorization management use cases with their dependencies.
 *
 * P0-009: `AddToGroupUseCase` and `RemoveFromGroupUseCase` were removed
 * along with the legacy Group hierarchy in the
 * `20260430040810_authz_refactor` migration.
 */

import { EventPublisherPort, LoggerPort } from '@/shared-kernel';
import type { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';
import { AuthorizationManagementUseCases } from './ports/authorization-use-cases.port';
import { AssignRoleUseCase } from './use-cases/authorization-management/assign-role.use-case';
import { DenyPermissionUseCase } from './use-cases/authorization-management/deny-permission.use-case';
import { GrantPermissionUseCase } from './use-cases/authorization-management/grant-permission.use-case';
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

  return {
    assignRoleUseCase,
    revokeRoleUseCase,
    grantPermissionUseCase,
    denyPermissionUseCase,
  };
}
