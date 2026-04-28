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
import { GroupRepository } from './infrastructure/repositories/group.repository';
import { PermissionRepository } from './infrastructure/repositories/permission.repository';
import { RoleRepository } from './infrastructure/repositories/role.repository';
import { UserAuthorizationRepository } from './infrastructure/repositories/user-authorization.repository';

export interface AuthorizationUseCases {
  readonly authService: AuthorizationService;
  readonly managementService: AuthorizationManagementService;
  readonly checks: AuthorizationCheckUseCases;
  readonly management: AuthorizationManagementUseCases;
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

  return {
    authService,
    managementService,
    checks,
    management,
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
