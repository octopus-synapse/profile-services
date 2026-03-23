/**
 * Protected Resource Decorators
 *
 * Composite decorators that combine permission + ownership checks.
 * These are convenience decorators for common patterns.
 *
 * Usage:
 * @ProtectedResource(Permission.RESUME_UPDATE, 'id', 'userId', 'resume')
 * @Patch(':id')
 * update() {}
 */
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ResourceOwner } from './ownership.guard';
import { Permission } from './permission.enum';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './require-permission.decorator';

/**
 * Protected resource: requires permission + ownership check.
 *
 * @param permission - Required permission
 * @param paramName - URL param containing resource ID
 * @param ownerField - Field on resource containing owner ID
 * @param model - Prisma model name
 *
 * @example
 * @ProtectedResource(Permission.RESUME_UPDATE, 'id', 'userId', 'resume')
 * @Patch(':id')
 * update() {}
 */
export const ProtectedResource = (
  permission: Permission,
  paramName: string,
  ownerField: string,
  model: string,
) =>
  applyDecorators(
    RequirePermission(permission),
    ResourceOwner(paramName, ownerField, model),
    ApiForbiddenResponse({ description: 'Not the resource owner' }),
  );

/**
 * Protected Resume: shorthand for resume ownership.
 *
 * @param permission - Required permission (e.g., RESUME_UPDATE)
 * @param paramName - URL param name (default: 'id')
 *
 * @example
 * @ProtectedResume(Permission.RESUME_UPDATE)
 * @Patch(':id')
 * update() {}
 *
 * @example
 * @ProtectedResume(Permission.RESUME_DELETE, 'resumeId')
 * @Delete(':resumeId')
 * delete() {}
 */
export const ProtectedResume = (permission: Permission, paramName = 'id') =>
  ProtectedResource(permission, paramName, 'userId', 'resume');

/**
 * Protected User Profile: shorthand for user self-access.
 *
 * @param permission - Required permission
 * @param paramName - URL param name (default: 'id')
 *
 * @example
 * @ProtectedUserProfile(Permission.USER_PROFILE_UPDATE)
 * @Patch(':id')
 * updateProfile() {}
 */
export const ProtectedUserProfile = (permission: Permission, paramName = 'id') =>
  ProtectedResource(permission, paramName, 'id', 'user');

/**
 * Authenticated Only: requires authentication but no specific permission.
 * Use for endpoints where any authenticated user can access.
 *
 * @example
 * @AuthenticatedOnly()
 * @Get('me')
 * getCurrentUser() {}
 */
export const AuthenticatedOnly = () =>
  applyDecorators(
    UseGuards(PermissionGuard), // Will pass since no permission is set
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Authentication required' }),
  );
