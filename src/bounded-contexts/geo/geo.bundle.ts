/**
 * Bundle type for the geo BC, in its own module so the routes file can
 * import it without creating a routes ↔ composition cycle.
 */

import type { SearchLocationsUseCase } from './application/use-cases/search-locations.use-case';

/** The route bundle: the use cases a geo route handler can call. */
export interface GeoBundle {
  readonly searchLocations: SearchLocationsUseCase;
}
