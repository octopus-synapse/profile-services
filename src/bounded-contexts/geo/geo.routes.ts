/**
 * Route descriptors for the geo BC — a read-only País/Estado/Cidade
 * lookup that powers the onboarding location autocomplete. The chosen
 * suggestion's `label` is what the client stores in the free-form
 * `location` field.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import type { GeoBundle } from './geo.bundle';
import { GeoLocationsQuerySchema, GeoLocationsResponseSchema } from './geo.routes.schemas';

export const geoRoutes: ReadonlyArray<Route<GeoBundle>> = [
  {
    method: 'GET',
    path: '/v1/geo/locations',
    auth: { kind: 'jwt' },
    // Hit during onboarding (location step), before onboarding completes —
    // opt out of the onboarding-completed gate (email-verified still applies),
    // else a mid-onboarding user gets 403 ONBOARDING_NOT_COMPLETED.
    guards: [{ id: 'skip-tos-check' }],
    query: GeoLocationsQuerySchema,
    response: GeoLocationsResponseSchema,
    openapi: {
      summary: 'Search country/state/city suggestions for a single-input location autocomplete',
      tags: ['geo'],
      description: 'Geo lookup',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const query = GeoLocationsQuerySchema.parse(ctx.query);
      const items = await bundle.searchLocations.execute(query);
      return { items };
    },
  },
];
