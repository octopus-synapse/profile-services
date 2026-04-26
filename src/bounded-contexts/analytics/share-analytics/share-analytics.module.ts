import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ShareAnalyticsReaderPort } from './application/ports/share-analytics-reader.port';
import { ShareAnalyticsController } from './controllers/share-analytics.controller';
import { ShareEventHandler } from './handlers/share-event.handler';
import { PrismaShareAnalyticsRepository } from './infrastructure';
import { NullGeoLookupAdapter } from './infrastructure/adapters/null-geo-lookup.adapter';
import { ShareAnalyticsRepositoryPort } from './ports';
import { GeoLookupPort } from './ports/geo-lookup.port';
import { ShareAnalyticsService } from './services/share-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShareAnalyticsController],
  providers: [
    { provide: ShareAnalyticsRepositoryPort, useClass: PrismaShareAnalyticsRepository },
    { provide: GeoLookupPort, useClass: NullGeoLookupAdapter },
    ShareAnalyticsService,
    { provide: ShareAnalyticsReaderPort, useExisting: ShareAnalyticsService },
    ShareEventHandler,
  ],
  exports: [ShareAnalyticsService],
})
export class ShareAnalyticsModule {}
