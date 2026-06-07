/**
 * Postgres-backed geo lookup over the GeoNames import (`GEO_SOURCE=postgres`).
 *
 * Searches the `GeoCountry` / `GeoAdmin1` / `GeoCity` tables populated by
 * `src/scripts/import-geonames.ts`. Matching is a case-/accent-insensitive
 * prefix over the pre-normalised `searchName` column (so "sao" → "São Paulo");
 * cities are ranked by population so the largest match surfaces first. Names
 * for the `City, State, Country` label are resolved in a single batched lookup
 * per tier to avoid N+1 queries.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type GeoLookupParams, GeoLookupPort } from '../../domain/ports/geo-lookup.port';
import type { GeoLocationItem } from '../../geo.routes.schemas';

/** Accent- and case-insensitive normalisation matching the import script. */
function norm(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export class PrismaGeoLookupAdapter extends GeoLookupPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async search(params: GeoLookupParams): Promise<GeoLocationItem[]> {
    const nq = norm(params.q);
    if (!nq) return [];

    const { level, country, state, limit } = params;
    const countryScope = country ? country.toUpperCase() : undefined;
    const items: GeoLocationItem[] = [];

    if (level === 'country' || level === 'all') {
      const rows = await this.prisma.geoCountry.findMany({
        where: { searchName: { startsWith: nq } },
        orderBy: { name: 'asc' },
        take: limit,
      });
      for (const c of rows) {
        items.push({ label: c.name, country: c.name, countryCode: c.code });
      }
    }

    if (level === 'state' || level === 'all') {
      const rows = await this.prisma.geoAdmin1.findMany({
        where: {
          searchName: { startsWith: nq },
          ...(countryScope ? { countryCode: countryScope } : {}),
        },
        orderBy: { name: 'asc' },
        take: limit,
      });
      const countryNames = await this.countryNames(rows.map((r) => r.countryCode));
      for (const s of rows) {
        const countryName = countryNames.get(s.countryCode) ?? s.countryCode;
        items.push({
          label: `${s.name}, ${countryName}`,
          state: s.name,
          stateCode: s.admin1Code,
          country: countryName,
          countryCode: s.countryCode,
        });
      }
    }

    if (level === 'city' || level === 'all') {
      const rows = await this.prisma.geoCity.findMany({
        where: {
          searchName: { startsWith: nq },
          ...(countryScope ? { countryCode: countryScope } : {}),
          ...(state ? { admin1Code: state } : {}),
        },
        orderBy: [{ population: 'desc' }, { name: 'asc' }],
        take: limit,
      });
      const countryNames = await this.countryNames(rows.map((r) => r.countryCode));
      const admin1Names = await this.admin1Names(rows);
      for (const c of rows) {
        const countryName = countryNames.get(c.countryCode) ?? c.countryCode;
        const stateName =
          c.admin1Code !== null ? admin1Names.get(`${c.countryCode}.${c.admin1Code}`) : undefined;
        const label = [c.name, stateName, countryName].filter(Boolean).join(', ');
        items.push({
          label,
          city: c.name,
          ...(stateName ? { state: stateName } : {}),
          ...(c.admin1Code !== null ? { stateCode: c.admin1Code } : {}),
          country: countryName,
          countryCode: c.countryCode,
        });
      }
    }

    return items.slice(0, limit);
  }

  /** countryCode → display name, one batched query. */
  private async countryNames(codes: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(codes)];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.geoCountry.findMany({
      where: { code: { in: unique } },
      select: { code: true, name: true },
    });
    return new Map(rows.map((r) => [r.code, r.name]));
  }

  /** "<countryCode>.<admin1Code>" → state name, one batched query. */
  private async admin1Names(
    cities: ReadonlyArray<{ countryCode: string; admin1Code: string | null }>,
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(
        cities.filter((c) => c.admin1Code !== null).map((c) => `${c.countryCode}.${c.admin1Code}`),
      ),
    ];
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.geoAdmin1.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }
}
