/**
 * `OwnershipGuard` pipeline stage (P0-004).
 *
 * Routes that need an "is the requester the owner of this resource"
 * gate declare:
 *
 *   guards: [{
 *     id: 'ownership',
 *     metadata: { entity: 'resume', paramKey: 'resumeId' }
 *   }]
 *
 * The stage:
 *   1. Reads `entity` + `paramKey` from the guard's metadata.
 *   2. Looks up the registered owner-resolver for that entity.
 *   3. Calls `resolver(ctx.params[paramKey])` — gets `userId | null`.
 *   4. Compares with `ctx.user.userId`. Mismatches throw
 *      `OwnershipAccessDeniedException` (403 — not 404 — to avoid
 *      leaking entity existence to non-owners).
 *
 * When to use this guard vs in-UC validation (CLAUDE.md convention):
 *   - **Guard (default)**: when ownership is a simple
 *     `paramKey → ownerId` query and the UC doesn't otherwise need to
 *     load the entity. Preferred — fail-fast before the handler runs.
 *   - **UC validation**: when the UC must already load the entity for
 *     other reasons (shared resumes with collaborator lists, public-flag
 *     entities, multi-owner aggregates). Skip the guard, do the
 *     comparison inside the use case to avoid a duplicate query.
 */

import {
  AuthenticationRequiredException,
  OwnershipAccessDeniedException,
  OwnershipMissingParamException,
  type OwnershipRegistry,
  OwnershipResourceMissingException,
  OwnershipUnknownModelException,
} from '@/shared-kernel/authorization';
import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { Route } from '@/shared-kernel/http/route.types';

export function ownershipGuardStage(registry: OwnershipRegistry): PipelineStage {
  return {
    name: 'ownershipGuard',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      const guard = route?.guards?.find((g) => g.id === 'ownership');
      if (!guard) return next();

      const meta = (guard.metadata ?? {}) as { entity?: unknown; paramKey?: unknown };
      const entity = typeof meta.entity === 'string' ? meta.entity : null;
      const paramKey = typeof meta.paramKey === 'string' ? meta.paramKey : null;
      if (!entity || !paramKey) {
        throw new Error(
          `OwnershipGuard: invalid metadata on ${route?.method} ${route?.path} — expected { entity: string, paramKey: string }`,
        );
      }

      const lookup = registry.resolve(entity);
      if (!lookup) throw new OwnershipUnknownModelException(entity);

      if (!ctx.user) throw new AuthenticationRequiredException();

      const params = (ctx.params ?? {}) as Record<string, unknown>;
      const id = params[paramKey];
      if (typeof id !== 'string' || id.length === 0) {
        throw new OwnershipMissingParamException(paramKey);
      }

      const ownerId = await lookup(id);
      if (ownerId === null) {
        // Resource missing — return 403 not 404 to avoid leaking
        // existence to non-owners. The exception's statusHint is 403.
        throw new OwnershipResourceMissingException();
      }
      if (ownerId !== ctx.user.userId) {
        throw new OwnershipAccessDeniedException();
      }

      await next();
    },
  };
}
