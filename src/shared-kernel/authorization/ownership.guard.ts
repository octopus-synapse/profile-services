/**
 * Ownership Guard & Decorator
 *
 * Verifies that the authenticated user owns the resource being accessed.
 * Admin users (with ADMIN_FULL_ACCESS) bypass ownership checks.
 *
 * Usage:
 * @RequirePermission(Permission.RESUME_UPDATE)
 * @ResourceOwner('id', 'userId')  // param name, owner field
 * @Patch(':id')
 * update() {}
 */
import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  AuthenticationRequiredException,
  OwnershipAccessDeniedException,
  OwnershipMissingParamException,
  OwnershipResourceMissingException,
} from './authorization.exceptions';
import { Permission } from './permission.enum';
import { hasPermission } from './permission-resolver';

// ============================================================================
// Metadata Keys
// ============================================================================

export const OWNERSHIP_KEY = 'resource_ownership';

export interface OwnershipMetadata {
  paramName: string; // URL param name (e.g., 'id', 'resumeId')
  ownerField: string; // Field on resource that contains owner ID
  model: string; // Prisma model name
}

// ============================================================================
// Decorator
// ============================================================================

/**
 * Requires the authenticated user to be the owner of the resource.
 *
 * @param paramName - URL parameter containing the resource ID
 * @param ownerField - Field on the resource that stores the owner's user ID
 * @param model - Prisma model name (e.g., 'resume', 'user')
 *
 * @example
 * // Resume owned by userId field
 * @ResourceOwner('id', 'userId', 'resume')
 * @Patch(':id')
 * update() {}
 *
 * @example
 * // User profile - user owns themselves
 * @ResourceOwner('id', 'id', 'user')
 * @Patch(':id')
 * updateProfile() {}
 */
export const ResourceOwner = (paramName: string, ownerField: string, model: string) =>
  applyDecorators(
    SetMetadata(OWNERSHIP_KEY, { paramName, ownerField, model } as OwnershipMetadata),
    UseGuards(OwnershipGuard),
  );

// ============================================================================
// Guard
// ============================================================================

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<OwnershipMetadata | undefined>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No ownership requirement
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { id: string; roles: string[] };
      params: Record<string, string>;
    }>();

    const user = request.user;

    if (!user) {
      throw new AuthenticationRequiredException();
    }

    // Admin bypass
    if (hasPermission(user.roles, Permission.ADMIN_FULL_ACCESS)) {
      return true;
    }

    const resourceId = request.params[metadata.paramName];

    if (!resourceId) {
      throw new OwnershipMissingParamException(metadata.paramName);
    }

    // Load resource and check ownership
    const resource = await this.loadResource(metadata.model, resourceId);

    if (!resource) {
      throw new OwnershipResourceMissingException();
    }

    const ownerId = (resource as Record<string, unknown>)[metadata.ownerField];

    if (ownerId !== user.id) {
      throw new OwnershipAccessDeniedException();
    }

    return true;
  }

  private async loadResource(model: string, id: string): Promise<unknown> {
    // Use Prisma's dynamic model access
    if (!(model in this.prisma)) {
      // Programmer-error assertion: caller passed a model name that is not on
      // the Prisma client. Not user-facing — fires only on misconfigured guard
      // metadata (controller/decorator typo).
      throw new Error(`Unknown model: ${model}`);
    }

    const delegate = this.prisma[model as keyof typeof this.prisma];

    if (
      typeof delegate !== 'object' ||
      delegate === null ||
      !('findUnique' in delegate) ||
      typeof delegate.findUnique !== 'function'
    ) {
      // Programmer-error assertion: same as above. The model exists on the
      // Prisma client but is not a delegate with `findUnique` — indicates a
      // wiring bug, not a user-input error.
      throw new Error(`Unknown model: ${model}`);
    }

    // Call findUnique dynamically via Reflect to avoid type incompatibility
    return Reflect.apply(delegate.findUnique, delegate, [{ where: { id } }]) as Promise<unknown>;
  }
}
