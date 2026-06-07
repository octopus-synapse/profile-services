import { GeoLookupPort } from '../../domain/ports/geo-lookup.port';
import type { GeoLocationItem, GeoLocationsQuery } from '../../geo.routes.schemas';

const DEFAULT_LIMIT = 10;

/**
 * Search País/Estado/Cidade suggestions for the single-input autocomplete.
 * Owns input defaulting/clamping; the dataset access + ranking lives in
 * the {@link GeoLookupPort} adapter.
 */
export class SearchLocationsUseCase {
  constructor(private readonly lookup: GeoLookupPort) {}

  execute(query: GeoLocationsQuery): Promise<GeoLocationItem[]> {
    return this.lookup.search({
      q: query.q,
      level: query.level ?? 'all',
      country: query.country,
      state: query.state,
      limit: query.limit ?? DEFAULT_LIMIT,
    });
  }
}
