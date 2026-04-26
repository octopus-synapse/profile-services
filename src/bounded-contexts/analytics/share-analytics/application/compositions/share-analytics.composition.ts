/**
 * Share Analytics Composition
 *
 * Wires share analytics use cases with their dependencies.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { ShareAnalyticsRepositoryPort } from '../../ports';
import { GeoLookupPort } from '../../ports/geo-lookup.port';
import { ShareAnalyticsUseCases } from '../ports/share-analytics.port';
import { GetShareAnalyticsUseCase } from '../use-cases/get-share-analytics/get-share-analytics.use-case';
import { GetShareEventsUseCase } from '../use-cases/get-share-events/get-share-events.use-case';
import { TrackShareEventUseCase } from '../use-cases/track-share-event/track-share-event.use-case';

export { ShareAnalyticsUseCases };

export function buildShareAnalyticsUseCases(
  repository: ShareAnalyticsRepositoryPort,
  geoLookup: GeoLookupPort,
  logger: LoggerPort,
): ShareAnalyticsUseCases {
  const trackShareEventUseCase = new TrackShareEventUseCase(repository, geoLookup, logger);
  const getShareAnalyticsUseCase = new GetShareAnalyticsUseCase(repository);
  const getShareEventsUseCase = new GetShareEventsUseCase(repository);

  return { trackShareEventUseCase, getShareAnalyticsUseCase, getShareEventsUseCase };
}
