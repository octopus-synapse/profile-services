/**
 * Route descriptors for the roles BC — a read-only job-title search
 * (ESCO / CBO / O*NET dictionary) that powers the Add Experience role
 * autocomplete. The chosen suggestion's `label` is what the client stores
 * in the free-form `role` field; free text is never blocked.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import type { RolesBundle } from './roles.bundle';
import { RolesSearchQuerySchema, RolesSearchResponseSchema } from './roles.routes.schemas';

export const rolesRoutes: ReadonlyArray<Route<RolesBundle>> = [
  {
    method: 'GET',
    path: '/v1/roles/search',
    auth: { kind: 'jwt' },
    // Hit during onboarding (Add Experience role), before onboarding completes —
    // opt out of the onboarding-completed gate (email-verified still applies),
    // else a mid-onboarding user gets 403 ONBOARDING_NOT_COMPLETED.
    guards: [{ id: 'skip-tos-check' }],
    query: RolesSearchQuerySchema,
    response: RolesSearchResponseSchema,
    openapi: {
      summary: 'Search job-title suggestions for the experience role autocomplete',
      tags: ['roles'],
      description: 'Role title search',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const query = RolesSearchQuerySchema.parse(ctx.query);
      const items = await bundle.searchRoles.execute(query);
      return { items };
    },
  },
];
