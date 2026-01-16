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

import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

// Domain
// (Domain services are created by application services, not injected)

// Infrastructure
import {
  PermissionRepository,
  RoleRepository,
  GroupRepository,
  UserAuthorizationRepository,
} from './infrastructure/repositories';
import { PermissionGuard } from './infrastructure/guards';

// Application
import { AuthorizationService } from './services/authorization.service';

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
  ],
  exports: [
    // Export service for use in other modules
    AuthorizationService,

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
