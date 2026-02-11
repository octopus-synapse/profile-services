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
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';

// Domain
// (Domain services are created by application services, not injected)

import { PermissionGuard } from './infrastructure/guards';
// Infrastructure
import {
  GroupRepository,
  PermissionRepository,
  RoleRepository,
  UserAuthorizationRepository,
} from './infrastructure/repositories';

// Application
import { AuthorizationService } from './services/authorization.service';
import { AuthorizationManagementService } from './services/authorization-management.service';

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
  ],
  exports: [
    // Export service for use in other modules
    AuthorizationService,
    AuthorizationManagementService,

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
