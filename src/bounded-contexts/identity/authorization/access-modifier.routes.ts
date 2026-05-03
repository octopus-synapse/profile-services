/**
 * Admin endpoints for AccessModifier — apply / revoke / list.
 *
 * Suspensions and individual permission grants live in the
 * `AccessModifier` table. The permission gate consults active
 * modifiers per request to add DENY (suspend state/role) and GRANT
 * (add a permission) overlays without mutating the underlying
 * timestamps or role assignments.
 *
 * All endpoints require admin (USER_MANAGE permission). The apply
 * endpoint refuses to suspend the calling admin's own admin role,
 * preventing accidental self-lockout.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import { DomainException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route.types';
import type { AccessModifierUseCases } from './authorization.composition';
import type { ModifierEffect, ModifierType } from './domain/entities/access-modifier.entity';

const MODIFIER_TYPES: readonly ModifierType[] = [
  'SUSPEND_EMAIL_VERIFIED',
  'SUSPEND_ONBOARDING',
  'SUSPEND_ROLE_USER',
  'SUSPEND_ROLE_ADMIN',
  'GRANT_PERMISSION',
] as const;

const MODIFIER_EFFECTS: readonly ModifierEffect[] = ['DENY', 'GRANT'] as const;

const UserIdParam = z.object({ userId: z.string().min(1) });
const ModifierIdParam = z.object({ userId: z.string().min(1), modifierId: z.string().min(1) });

const ApplyModifierBody = z
  .object({
    modifierType: z.enum(MODIFIER_TYPES as readonly [ModifierType, ...ModifierType[]]),
    effect: z.enum(MODIFIER_EFFECTS as readonly [ModifierEffect, ...ModifierEffect[]]),
    reason: z.string().min(1).max(500),
    permissionId: z.string().min(1).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.modifierType === 'GRANT_PERMISSION' && !data.permissionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['permissionId'],
        message: 'permissionId is required when modifierType is GRANT_PERMISSION',
      });
    }
  });

export class SelfDemoteForbiddenException extends DomainException {
  readonly code = 'SELF_DEMOTE_FORBIDDEN';
  readonly statusHint = 403;
  constructor() {
    super('An admin cannot apply SUSPEND_ROLE_ADMIN to their own account.');
  }
}

// ─── Response schemas ────────────────────────────────────────────────
// `AccessModifierProps` (toJSON output) — Date fields become ISO strings
// once serialized through `JSON.stringify`. Mirrors the entity props.
const AccessModifierShape = z.object({
  id: z.string(),
  userId: z.string(),
  modifierType: z.enum(MODIFIER_TYPES as readonly [ModifierType, ...ModifierType[]]),
  effect: z.enum(MODIFIER_EFFECTS as readonly [ModifierEffect, ...ModifierEffect[]]),
  permissionId: z.string().nullable(),
  reason: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  createdBy: z.string(),
  revokedAt: z.string().datetime().nullable(),
  revokedBy: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const ListAccessModifiersResponseSchema = z.object({
  modifiers: z.array(AccessModifierShape),
});

export const accessModifierRoutes: ReadonlyArray<Route<AccessModifierUseCases>> = [
  // POST /api/v1/admin/users/:userId/access-modifiers
  {
    method: 'POST',
    path: '/v1/admin/users/:userId/access-modifiers',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.USER_MANAGE,
    params: UserIdParam,
    body: ApplyModifierBody,
    response: AccessModifierShape,
    openapi: {
      summary: 'Apply an access modifier (suspension or grant) to a user',
      tags: ['admin-access-modifiers'],
      description: 'Authorization Admin API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { userId } = ctx.params as { userId: string };
      const body = ctx.body as z.infer<typeof ApplyModifierBody>;
      const adminId = ctx.user!.userId;

      // Anti-lockout: an admin can never suspend their own admin role.
      if (
        userId === adminId &&
        body.modifierType === 'SUSPEND_ROLE_ADMIN' &&
        body.effect === 'DENY'
      ) {
        throw new SelfDemoteForbiddenException();
      }

      const modifier = await bc.apply.execute({
        userId,
        modifierType: body.modifierType,
        effect: body.effect,
        permissionId: body.permissionId ?? null,
        reason: body.reason,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        createdBy: adminId,
      });

      return modifier.toJSON();
    },
  },
  // DELETE /api/v1/admin/users/:userId/access-modifiers/:modifierId
  {
    method: 'DELETE',
    path: '/v1/admin/users/:userId/access-modifiers/:modifierId',
    statusCode: 204,
    auth: { kind: 'jwt' },
    permission: Permission.USER_MANAGE,
    params: ModifierIdParam,
    openapi: {
      summary: 'Revoke an active access modifier',
      tags: ['admin-access-modifiers'],
      description: 'Authorization Admin API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { modifierId } = ctx.params as { modifierId: string };
      await bc.revoke.execute(modifierId, ctx.user!.userId);
    },
  },
  // GET /api/v1/admin/users/:userId/access-modifiers
  {
    method: 'GET',
    path: '/v1/admin/users/:userId/access-modifiers',
    auth: { kind: 'jwt' },
    permission: Permission.USER_MANAGE,
    params: UserIdParam,
    response: ListAccessModifiersResponseSchema,
    openapi: {
      summary: 'List currently active access modifiers for a user',
      tags: ['admin-access-modifiers'],
      description: 'Authorization Admin API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { userId } = ctx.params as { userId: string };
      const modifiers = await bc.listActive.execute(userId);
      return { modifiers: modifiers.map((m) => m.toJSON()) };
    },
  },
];
