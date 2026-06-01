import type { GeoLocationItem } from '../../geo.routes.schemas';

/** Parameters for a single location lookup. `level` narrows the tiers
 *  searched; `country` / `state` (ISO codes) scope the search. */
export interface GeoLookupParams {
  readonly q: string;
  readonly level: 'country' | 'state' | 'city' | 'all';
  readonly country?: string;
  readonly state?: string;
  readonly limit: number;
}

/**
 * Read-only lookup over a country/state/city dataset. The concrete adapter
 * owns the dataset (bundled, no outbound traffic) and the
 * ranking/normalisation; the application layer only clamps inputs and
 * shapes the response.
 */
export abstract class GeoLookupPort {
  abstract search(params: GeoLookupParams): GeoLocationItem[];
}
