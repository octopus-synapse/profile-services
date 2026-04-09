/**
 * Authorization Module
 *
 * NestJS module for dynamic RBAC (Role-Based Access Control).
 *
 * Architecture:
 * - Domain Layer: Entities (Permission, Role, Group) and Domain Services
 * - Infrastructure Layer: Repositories and Guards
 * - Application Layer: AuthorizationService
 *
 * Usage:
 * 1. Import AuthorizationModule in your module
 * 2. Use @RequirePermission('resource', 'action') decorator
 * 3. Add PermissionGuard to your controller/route
 *
 * @example
 * // In controller
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission('resume', 'create')
 * @Post()
 * async createResume() { ... }
 *
 * @example
 * // Using the composite decorator
 * @Protected('resume', 'create')
 * @Post()
 * async createResume() { ... }
 */

import { Global, Module } from '@nestjs/common';
import { AuthorizationCheckPort } from '@/shared-kernel/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';

// Domain
// (Domain services are created by application services, not injected)

import { AuthorizationServicePort } from './application/ports/authorization-service.port';
// Application
import { AuthorizationService } from './application/services/authorization.service';
import { AuthorizationManagementService } from './application/services/authorization-management.service';
import { PermissionGuard } from './infrastructure/guards';
// Infrastructure
import {
  GroupRepository,
  PermissionRepository,
  RoleRepository,
  UserAuthorizationRepository,
} from './infrastructure/repositories';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    // Repositories
    PermissionRepository,
    RoleRepository,
    GroupRepository,
    UserAuthorizationRepository,

    // Guards
    PermissionGuard,

    // Services
    AuthorizationService,
    AuthorizationManagementService,
    // Port abstraction (uses AuthorizationService as concrete implementation)
    {
      provide: AuthorizationServicePort,
      useExisting: AuthorizationService,
    },
    // Shared-kernel port (narrow ISP interface for cross-BC consumers)
    {
      provide: AuthorizationCheckPort,
      useExisting: AuthorizationService,
    },
  ],
  exports: [
    // Export service for use in other modules
    AuthorizationService,
    AuthorizationManagementService,

    // Export port abstraction for dependency injection
    AuthorizationServicePort,

    // Export shared-kernel port for cross-BC consumers
    AuthorizationCheckPort,

    // Export guards for use in controllers
    PermissionGuard,

    // Export repositories for admin operations
    PermissionRepository,
    RoleRepository,
    GroupRepository,
    UserAuthorizationRepository,
  ],
})
export class AuthorizationModule {}
