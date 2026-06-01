/**
 * Framework-free wiring for the geo BC. No infra deps (no Prisma, no
 * events) — the dataset is bundled in the adapter. The bootstrap mounts
 * `{ bundle, routes }` like any other BC.
 */

import { SearchLocationsUseCase } from './application/use-cases/search-locations.use-case';
import { BundledGeoLookupAdapter } from './infrastructure/adapters/bundled-geo-lookup.adapter';
import { geoRoutes } from './geo.routes';

/** The route bundle: the use cases a geo route handler can call. */
export interface GeoBundle {
  readonly searchLocations: SearchLocationsUseCase;
}

export function buildGeoComposition(): { useCases: GeoBundle; routes: typeof geoRoutes } {
  const lookup = new BundledGeoLookupAdapter();
  const useCases: GeoBundle = {
    searchLocations: new SearchLocationsUseCase(lookup),
  };
  return { useCases, routes: geoRoutes };
}
