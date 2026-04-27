import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusPort, LoggerPort } from '@/shared-kernel';
import { ShareAnalyticsReaderPort } from './application/ports/share-analytics-reader.port';
import { registerShareAnalyticsHandlers } from './handlers/register-handlers';
import { PrismaShareAnalyticsRepository } from './infrastructure';
import { NullGeoLookupAdapter } from './infrastructure/adapters/null-geo-lookup.adapter';
import { ShareAnalyticsRepositoryPort } from './ports';
import { GeoLookupPort } from './ports/geo-lookup.port';
import { ShareAnalyticsService } from './services/share-analytics.service';
import { shareAnalyticsRoutes } from './share-analytics.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(ShareAnalyticsReaderPort, shareAnalyticsRoutes),
  providers: [
    { provide: ShareAnalyticsRepositoryPort, useClass: PrismaShareAnalyticsRepository },
    { provide: GeoLookupPort, useClass: NullGeoLookupAdapter },
    ShareAnalyticsService,
    { provide: ShareAnalyticsReaderPort, useExisting: ShareAnalyticsService },
    {
      provide: 'SHARE_ANALYTICS_HANDLERS_REGISTERED',
      useFactory: (
        eventBus: EventBusPort,
        analyticsService: ShareAnalyticsService,
        logger: LoggerPort,
      ): boolean => {
        registerShareAnalyticsHandlers({ eventBus, analyticsService, logger });
        return true;
      },
      inject: [EventBusPort, ShareAnalyticsService, LoggerPort],
    },
  ],
  exports: [ShareAnalyticsService],
})
export class ShareAnalyticsModule {}
