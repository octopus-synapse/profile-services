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
import { DomainException } from '@/shared-kernel/exceptions';
import { UserIdParamSchema } from '@/shared-kernel/schemas/params';
import { ShortDescriptionSchema } from '@/shared-kernel/schemas/primitives';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import type { ModifierEffect, ModifierType } from './domain/entities/access-modifier.entity';

export const MODIFIER_TYPES: readonly ModifierType[] = [
  'SUSPEND_EMAIL_VERIFIED',
  'SUSPEND_ONBOARDING',
  'SUSPEND_ROLE_USER',
  'SUSPEND_ROLE_ADMIN',
  'GRANT_PERMISSION',
] as const;

export const MODIFIER_EFFECTS: readonly ModifierEffect[] = ['DENY', 'GRANT'] as const;

export const UserIdParam = UserIdParamSchema;
export const ModifierIdParam = UserIdParamSchema.extend({
  modifierId: z.string().uuid('modifierId must be a valid UUID'),
});

export const ApplyModifierBody = z
  .object({
    modifierType: z.enum(MODIFIER_TYPES as readonly [ModifierType, ...ModifierType[]]),
    effect: z.enum(MODIFIER_EFFECTS as readonly [ModifierEffect, ...ModifierEffect[]]),
    reason: ShortDescriptionSchema,
    permissionId: z.string().uuid('permissionId must be a valid UUID').optional(),
    startsAt: IsoDateTimeSchema.optional(),
    endsAt: IsoDateTimeSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.modifierType === 'GRANT_PERMISSION' && !data.permissionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['permissionId'],
        message: 'permissionId is required when modifierType is GRANT_PERMISSION',
      });
    }
  })
  .openapi({
    example: {
      modifierType: 'SUSPEND_ROLE_USER',
      effect: 'DENY',
      reason: 'Account under investigation for policy violation.',
      endsAt: '2026-06-01T00:00:00.000Z',
    },
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
export const AccessModifierShape = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  modifierType: z.enum(MODIFIER_TYPES as readonly [ModifierType, ...ModifierType[]]),
  effect: z.enum(MODIFIER_EFFECTS as readonly [ModifierEffect, ...ModifierEffect[]]),
  permissionId: z.string().uuid().nullable(),
  reason: z.string(),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
  createdBy: z.string(),
  revokedAt: IsoDateTimeSchema.nullable(),
  revokedBy: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ListAccessModifiersResponseSchema = z.object({
  modifiers: z.array(AccessModifierShape),
});
