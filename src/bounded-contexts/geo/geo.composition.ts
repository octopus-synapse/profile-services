/**
 * Wiring for the geo BC. The lookup source is chosen by the `GEO_SOURCE`
 * env var:
 *   - `bundled` (default) — in-memory `country-state-city` dataset, zero infra.
 *   - `postgres`          — GeoNames import in Postgres (worldwide coverage),
 *                           populated by `bun run geo:import`.
 *
 * The bundled path needs no infra; the Postgres path reuses the shared
 * `PrismaService`. The bootstrap mounts `{ bundle, routes }` like any other BC.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import { SearchLocationsUseCase } from './application/use-cases/search-locations.use-case';
import type { GeoLookupPort } from './domain/ports/geo-lookup.port';
import type { GeoBundle } from './geo.bundle';
import { geoRoutes } from './geo.routes';

export type { GeoBundle } from './geo.bundle';

import { BundledGeoLookupAdapter } from './infrastructure/adapters/bundled-geo-lookup.adapter';
import { PrismaGeoLookupAdapter } from './infrastructure/adapters/prisma-geo-lookup.adapter';

export function buildGeoComposition(
  prisma: PrismaService,
  config: ConfigPort,
  logger: LoggerPort,
): { useCases: GeoBundle; routes: typeof geoRoutes; lookup: GeoLookupPort } {
  const source = config.getOrDefault<string>('GEO_SOURCE', 'bundled');
  const lookup: GeoLookupPort =
    source === 'postgres'
      ? new PrismaGeoLookupAdapter(prisma, logger)
      : new BundledGeoLookupAdapter();

  const useCases: GeoBundle = {
    searchLocations: new SearchLocationsUseCase(lookup),
  };
  // `lookup` is exposed so other BCs (onboarding) can validate that a stored
  // location is a real dataset entry via `lookup.locationExists`.
  return { useCases, routes: geoRoutes, lookup };
}
