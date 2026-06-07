/**
 * Route descriptors for the geo BC — a read-only País/Estado/Cidade
 * lookup that powers the onboarding location autocomplete. The chosen
 * suggestion's `label` is what the client stores in the free-form
 * `location` field.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import type { GeoBundle } from './geo.composition';
import {
  type GeoLocationsQuery,
  GeoLocationsQuerySchema,
  GeoLocationsResponseSchema,
} from './geo.routes.schemas';

export const geoRoutes: ReadonlyArray<Route<GeoBundle>> = [
  {
    method: 'GET',
    path: '/v1/geo/locations',
    auth: { kind: 'jwt' },
    query: GeoLocationsQuerySchema,
    response: GeoLocationsResponseSchema,
    openapi: {
      summary: 'Search country/state/city suggestions for a single-input location autocomplete',
      tags: ['geo'],
      description: 'Geo lookup',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const query = ctx.query as GeoLocationsQuery;
      const items = await bundle.searchLocations.execute(query);
      return { items };
    },
  },
];
