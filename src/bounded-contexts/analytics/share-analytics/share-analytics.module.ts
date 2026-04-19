import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ShareAnalyticsReaderPort } from './application/ports/share-analytics-reader.port';
import { ShareAnalyticsController } from './controllers/share-analytics.controller';
import { ShareEventHandler } from './handlers/share-event.handler';
import { PrismaShareAnalyticsRepository } from './infrastructure';
import { NullGeoLookupAdapter } from './infrastructure/adapters/null-geo-lookup.adapter';
import { GEO_LOOKUP_PORT, SHARE_ANALYTICS_REPOSITORY } from './ports';
import { ShareAnalyticsService } from './services/share-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShareAnalyticsController],
  providers: [
    {
      provide: SHARE_ANALYTICS_REPOSITORY,
      useClass: PrismaShareAnalyticsRepository,
    },
    {
      provide: GEO_LOOKUP_PORT,
      useClass: NullGeoLookupAdapter,
    },
    ShareAnalyticsService,
    {
      provide: ShareAnalyticsReaderPort,
      useExisting: ShareAnalyticsService,
    },
    ShareEventHandler,
  ],
  exports: [ShareAnalyticsService],
})
export class ShareAnalyticsModule {}
