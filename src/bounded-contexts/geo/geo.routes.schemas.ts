/**
 * Zod schemas + bundle types for `geo.routes.ts`.
 *
 * The geo BC powers a single-input País/Estado/Cidade autocomplete. It is
 * a read-only lookup over a bundled dataset — the final value the client
 * stores is still the free-form `location` string (the item `label`).
 */

import { z } from 'zod';

/** One autocomplete suggestion. A city implies its state + country; a
 *  state implies its country; a country stands alone. `label` is the
 *  ready-to-store display string (`City, State, Country`). */
export const GeoLocationItemSchema = z.object({
  label: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional().openapi({ example: 'SP' }),
  country: z.string(),
  countryCode: z.string().openapi({ example: 'BR' }),
});
export type GeoLocationItem = z.infer<typeof GeoLocationItemSchema>;

export const GeoLocationsResponseSchema = z.object({
  items: z.array(GeoLocationItemSchema),
});
export type GeoLocationsResponse = z.infer<typeof GeoLocationsResponseSchema>;

/** Query for `GET /v1/geo/locations`. `level` narrows results to one tier
 *  (omit / `all` returns countries + states + cities ranked together).
 *  `country` / `state` are ISO codes that scope a state/city search so the
 *  cascading single-input UX can keep narrowing without re-scanning the
 *  whole dataset. */
export const GeoLocationsQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  level: z.enum(['country', 'state', 'city', 'all']).optional(),
  country: z.string().trim().min(2).max(3).optional(),
  state: z.string().trim().min(1).max(3).optional(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});
export type GeoLocationsQuery = z.infer<typeof GeoLocationsQuerySchema>;
