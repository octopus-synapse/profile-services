/**
 * Pure-TS wiring for the identity/authorization BC. Zero `@nestjs/*`
 * imports. Returns the dynamic-RBAC service surface plus the
 * check/management use-case bundles.
 *
 * `PermissionGuard` (CanActivate) stays Nest-coupled and lives in the
 * Nest module shell — it just consumes `AuthorizationService` from this
 * composition.
 *
 * Existing partial compositions
 * (`authorization-checks.composition.ts`,
 * `authorization-management.composition.ts`) are reused unchanged.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisher, LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import {
  AuthorizationCheckUseCases,
  buildAuthorizationCheckUseCases,
} from './application/authorization-checks.composition';
import {
  AuthorizationManagementUseCases,
  buildAuthorizationManagementUseCases,
} from './application/authorization-management.composition';
import { AuthorizationService } from './application/services/authorization.service';
import { AuthorizationManagementService } from './application/services/authorization-management.service';
import { ApplyAccessModifierUseCase } from './application/use-cases/access-modifier/apply-access-modifier.use-case';
import { ListActiveModifiersUseCase } from './application/use-cases/access-modifier/list-active-modifiers.use-case';
import { RevokeAccessModifierUseCase } from './application/use-cases/access-modifier/revoke-access-modifier.use-case';
import { AccessModifierAuditLogAdapter } from './infrastructure/adapters/audit-log.adapter';
import { AccessModifierRepository } from './infrastructure/repositories/access-modifier.repository';
import { GroupRepository } from './infrastructure/repositories/group.repository';
import { PermissionRepository } from './infrastructure/repositories/permission.repository';
import { RoleRepository } from './infrastructure/repositories/role.repository';
import { UserAuthorizationRepository } from './infrastructure/repositories/user-authorization.repository';

export interface AccessModifierUseCases {
  readonly apply: ApplyAccessModifierUseCase;
  readonly revoke: RevokeAccessModifierUseCase;
  readonly listActive: ListActiveModifiersUseCase;
  readonly repository: AccessModifierRepository;
}

export interface AuthorizationUseCases {
  readonly authService: AuthorizationService;
  readonly managementService: AuthorizationManagementService;
  readonly checks: AuthorizationCheckUseCases;
  readonly management: AuthorizationManagementUseCases;
  readonly accessModifier: AccessModifierUseCases;
  readonly permissionRepo: PermissionRepository;
  readonly roleRepo: RoleRepository;
  readonly groupRepo: GroupRepository;
  readonly userAuthRepo: UserAuthorizationRepository;
}

export function buildAuthorizationUseCases(
  prisma: PrismaService,
  eventPublisher: EventPublisher,
  logger: LoggerPort,
): AuthorizationUseCases {
  const permissionRepo = new PermissionRepository(prisma);
  const roleRepo = new RoleRepository(prisma);
  const groupRepo = new GroupRepository(prisma, logger);
  const userAuthRepo = new UserAuthorizationRepository(prisma);

  const authService = new AuthorizationService(permissionRepo, roleRepo, groupRepo, userAuthRepo);
  const managementService = new AuthorizationManagementService(userAuthRepo, eventPublisher);

  const checks = buildAuthorizationCheckUseCases(
    permissionRepo,
    roleRepo,
    groupRepo,
    userAuthRepo,
    logger,
  );
  const management = buildAuthorizationManagementUseCases(userAuthRepo, eventPublisher, logger);

  const auditLog = new AccessModifierAuditLogAdapter(prisma, logger);
  const accessModifierRepo = new AccessModifierRepository(prisma, logger);
  const accessModifier: AccessModifierUseCases = {
    apply: new ApplyAccessModifierUseCase(accessModifierRepo, auditLog, logger),
    revoke: new RevokeAccessModifierUseCase(accessModifierRepo, auditLog, logger),
    listActive: new ListActiveModifiersUseCase(accessModifierRepo),
    repository: accessModifierRepo,
  };

  return {
    authService,
    managementService,
    checks,
    management,
    accessModifier,
    permissionRepo,
    roleRepo,
    groupRepo,
    userAuthRepo,
  };
}

export function buildAuthorizationComposition(
  prisma: PrismaService,
  eventPublisher: EventPublisher,
  logger: LoggerPort,
): BoundedContextComposition<AuthorizationUseCases> {
  const useCases = buildAuthorizationUseCases(prisma, eventPublisher, logger);

  return {
    useCases,
    routes: [],
  };
}
