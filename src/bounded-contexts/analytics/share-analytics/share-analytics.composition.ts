/**
 * Pure-TS wiring for the share-analytics submodule. Zero `@nestjs/*`
 * imports.
 *
 * Returns a `BoundedContextComposition` whose `useCases` is the
 * `ShareAnalyticsReaderPort` shape consumed by `shareAnalyticsRoutes`.
 * The shared service POJO doubles as the reader and the cross-context
 * event handler target. The composition also surfaces the BC's
 * `eventHandlers` so the bootstrap can wire `presentation.share.viewed`
 * / `presentation.share.downloaded` to the in-process event bus.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BcEventBinding, BoundedContextComposition } from '@/shared-kernel/composition';
import { ShareAnalyticsReaderPort } from './application/ports/share-analytics-reader.port';
import { ShareEventHandler } from './handlers/share-event.handler';
import { NullGeoLookupAdapter } from './infrastructure/adapters/null-geo-lookup.adapter';
import { PrismaShareAnalyticsRepository } from './infrastructure/prisma-share-analytics.repository';
import type { ShareAnalyticsRepositoryPort } from './ports';
import type { GeoLookupPort } from './ports/geo-lookup.port';
import { ShareAnalyticsService } from './services/share-analytics.service';
import { shareAnalyticsRoutes } from './share-analytics.routes';

export { ShareAnalyticsReaderPort, ShareAnalyticsService };

export interface ShareAnalyticsBundle {
  readonly reader: ShareAnalyticsReaderPort;
  readonly service: ShareAnalyticsService;
  readonly repository: ShareAnalyticsRepositoryPort;
  readonly geoLookup: GeoLookupPort;
}

export function buildShareAnalyticsBundle(
  prisma: PrismaService,
  geoLookup: GeoLookupPort = new NullGeoLookupAdapter(),
): ShareAnalyticsBundle {
  const repository = new PrismaShareAnalyticsRepository(prisma);
  const service = new ShareAnalyticsService(repository, geoLookup);
  return { reader: service, service, repository, geoLookup };
}

/**
 * Build the framework-free composition for the share-analytics BC.
 *
 * The bootstrap is responsible for calling
 * `eventBus.on(b.eventType, b.handler)` for each `eventHandlers` entry.
 */
export function buildShareAnalyticsComposition(
  prisma: PrismaService,
  logger: LoggerPort,
  geoLookup: GeoLookupPort = new NullGeoLookupAdapter(),
): BoundedContextComposition<ShareAnalyticsReaderPort> & {
  readonly service: ShareAnalyticsService;
} {
  const bundle = buildShareAnalyticsBundle(prisma, geoLookup);
  const handler = new ShareEventHandler(bundle.service, logger);

  // Cross-context string event types (originating from presentation BC).
  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    {
      eventType: 'presentation.share.viewed',
      handler: handler.handleShareViewed.bind(handler),
    },
    {
      eventType: 'presentation.share.downloaded',
      handler: handler.handleShareDownloaded.bind(handler),
    },
  ];

  return {
    useCases: bundle.reader,
    routes: shareAnalyticsRoutes,
    eventHandlers,
    service: bundle.service,
  };
}
