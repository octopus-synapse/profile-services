/**
 * Bundled geo lookup — wraps the `country-state-city` dataset (offline, no
 * outbound traffic, no SafeFetchPort needed). Powers the single-input
 * País/Estado/Cidade autocomplete.
 *
 * Cost note: a global city search scans a large in-memory array. We bound
 * it by (a) preferring scoped getters when the client passes a country/
 * state ISO code, and (b) stopping the global scan once enough
 * prefix-matches are collected. The route is JWT-gated and the client
 * debounces, so the occasional full scan (a `q` that matches nothing) is
 * acceptable.
 */

import { City, Country, type ICity, type IState, State } from 'country-state-city';
import type { GeoLocationItem } from '../../geo.routes.schemas';
import { type GeoLookupParams, GeoLookupPort } from '../../domain/ports/geo-lookup.port';

/** Accent- and case-insensitive normalisation so "sao paulo" matches
 *  "São Paulo". */
function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

type Ranked = { item: GeoLocationItem; score: number; tier: number; len: number };

/** startsWith → 0, includes → 1, no match → -1. */
function matchScore(haystack: string, needle: string): number {
  if (haystack.startsWith(needle)) return 0;
  if (haystack.includes(needle)) return 1;
  return -1;
}

export class BundledGeoLookupAdapter extends GeoLookupPort {
  /** countryCode → country name, built once. */
  private countryNameByCode: Map<string, string> | null = null;

  private getCountryName(code: string): string {
    if (!this.countryNameByCode) {
      this.countryNameByCode = new Map(Country.getAllCountries().map((c) => [c.isoCode, c.name]));
    }
    return this.countryNameByCode.get(code) ?? code;
  }

  search(params: GeoLookupParams): GeoLocationItem[] {
    const nq = norm(params.q);
    if (!nq) return [];
    const { level, country, state, limit } = params;
    const ranked: Ranked[] = [];

    if (level === 'country' || level === 'all') {
      for (const c of Country.getAllCountries()) {
        const score = matchScore(norm(c.name), nq);
        if (score < 0) continue;
        ranked.push({
          item: { label: c.name, country: c.name, countryCode: c.isoCode },
          score,
          tier: 0,
          len: c.name.length,
        });
      }
    }

    if (level === 'state' || level === 'all') {
      const states: IState[] = country ? State.getStatesOfCountry(country) : State.getAllStates();
      for (const s of states) {
        const score = matchScore(norm(s.name), nq);
        if (score < 0) continue;
        const countryName = this.getCountryName(s.countryCode);
        ranked.push({
          item: {
            label: `${s.name}, ${countryName}`,
            state: s.name,
            stateCode: s.isoCode,
            country: countryName,
            countryCode: s.countryCode,
          },
          score,
          tier: 1,
          len: s.name.length,
        });
      }
    }

    if (level === 'city' || level === 'all') {
      const cities = this.scopedCities(country, state);
      // Cap the prefix-match pool so a hot prefix doesn't scan the whole
      // global array. includes-matches are collected up to `limit`.
      const startsCap = limit * 4;
      let startsCount = 0;
      const stateNameCache = new Map<string, string>();
      for (const c of cities) {
        const score = matchScore(norm(c.name), nq);
        if (score < 0) continue;
        const countryName = this.getCountryName(c.countryCode);
        const stateName = this.stateName(c, stateNameCache);
        const label = [c.name, stateName, countryName].filter(Boolean).join(', ');
        ranked.push({
          item: {
            label,
            city: c.name,
            state: stateName || undefined,
            stateCode: c.stateCode || undefined,
            country: countryName,
            countryCode: c.countryCode,
          },
          score,
          tier: 2,
          len: c.name.length,
        });
        if (score === 0 && ++startsCount >= startsCap) break;
      }
    }

    ranked.sort(
      (a, b) =>
        a.score - b.score ||
        a.tier - b.tier ||
        a.len - b.len ||
        a.item.label.localeCompare(b.item.label),
    );

    return ranked.slice(0, limit).map((r) => r.item);
  }

  private scopedCities(country?: string, state?: string): ICity[] {
    if (country && state) return City.getCitiesOfState(country, state);
    if (country) return City.getCitiesOfCountry(country) ?? [];
    return City.getAllCities();
  }

  private stateName(city: ICity, cache: Map<string, string>): string {
    if (!city.stateCode) return '';
    const key = `${city.countryCode}:${city.stateCode}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const name = State.getStateByCodeAndCountry(city.stateCode, city.countryCode)?.name ?? '';
    cache.set(key, name);
    return name;
  }
}
