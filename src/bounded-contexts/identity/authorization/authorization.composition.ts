import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
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
import { ApplyAccessModifierUseCase } from './application/use-cases/access-modifier/apply-access-modifier.use-case';
import { ListActiveModifiersUseCase } from './application/use-cases/access-modifier/list-active-modifiers.use-case';
import { RevokeAccessModifierUseCase } from './application/use-cases/access-modifier/revoke-access-modifier.use-case';
import {
  PermissionDeniedEvent,
  PermissionGrantedEvent,
  RoleAssignedEvent,
  RoleRevokedEvent,
} from './domain/events';
import { AccessModifierAuditLogAdapter } from './infrastructure/adapters/audit-log.adapter';
import { AuthorizationCacheInvalidationHandler } from './infrastructure/handlers/authorization-cache-invalidation.handler';
import { AccessModifierRepository } from './infrastructure/repositories/access-modifier.repository';
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
  readonly checks: AuthorizationCheckUseCases;
  readonly management: AuthorizationManagementUseCases;
  readonly accessModifier: AccessModifierUseCases;
  readonly permissionRepo: PermissionRepository;
  readonly roleRepo: RoleRepository;
  readonly userAuthRepo: UserAuthorizationRepository;
}

export function buildAuthorizationUseCases(
  prisma: PrismaService,
  eventBus: EventBusPort,
  logger: LoggerPort,
): AuthorizationUseCases {
  const permissionRepo = new PermissionRepository(prisma);
  const roleRepo = new RoleRepository(prisma);
  const userAuthRepo = new UserAuthorizationRepository(prisma);

  const authService = new AuthorizationService(permissionRepo, roleRepo, userAuthRepo);

  const checks = buildAuthorizationCheckUseCases(permissionRepo, roleRepo, userAuthRepo, logger);
  const management = buildAuthorizationManagementUseCases(userAuthRepo, eventBus, logger);

  const cacheInvalidation = new AuthorizationCacheInvalidationHandler(authService, logger);
  eventBus.on(RoleAssignedEvent.TYPE, (event) =>
    cacheInvalidation.handleRoleAssigned(event as RoleAssignedEvent),
  );
  eventBus.on(RoleRevokedEvent.TYPE, (event) =>
    cacheInvalidation.handleRoleRevoked(event as RoleRevokedEvent),
  );
  eventBus.on(PermissionGrantedEvent.TYPE, (event) =>
    cacheInvalidation.handlePermissionGranted(event as PermissionGrantedEvent),
  );
  eventBus.on(PermissionDeniedEvent.TYPE, (event) =>
    cacheInvalidation.handlePermissionDenied(event as PermissionDeniedEvent),
  );

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
    checks,
    management,
    accessModifier,
    permissionRepo,
    roleRepo,
    userAuthRepo,
  };
}

export function buildAuthorizationComposition(
  prisma: PrismaService,
  eventBus: EventBusPort,
  logger: LoggerPort,
): BoundedContextComposition<AuthorizationUseCases> {
  const useCases = buildAuthorizationUseCases(prisma, eventBus, logger);

  return {
    useCases,
    routes: [],
  };
}
