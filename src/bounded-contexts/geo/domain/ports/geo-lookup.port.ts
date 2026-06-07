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
 * owns the dataset (bundled in-memory, or a Postgres-backed GeoNames import)
 * and the ranking/normalisation; the application layer only clamps inputs and
 * shapes the response.
 *
 * `search` is async so a DB-backed adapter (GeoNames → Postgres) satisfies the
 * same port as the synchronous bundled one.
 */
export abstract class GeoLookupPort {
  abstract search(params: GeoLookupParams): Promise<GeoLocationItem[]>;

  /**
   * True when `label` exactly matches a known location label (the
   * `City, State, Country` string the picker stores). Lets callers reject
   * free-text locations server-side — accepting only values that came from
   * the dataset. Concrete here (uses `search`) so every adapter shares it.
   */
  async locationExists(label: string): Promise<boolean> {
    const target = label.trim().toLowerCase();
    if (!target) return false;
    // Search by the leading segment (city / state / country name) and confirm
    // one of the suggestions reproduces the exact stored label.
    const firstSegment = label.split(',')[0]?.trim() || label;
    const results = await this.search({ q: firstSegment, level: 'all', limit: 50 });
    return results.some((item) => item.label.trim().toLowerCase() === target);
  }
}
