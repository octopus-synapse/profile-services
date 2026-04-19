/**
 * Resume Analytics Module
 *
 * Architecture: Clean Architecture / Hexagonal.
 * Services depend on ports defined in `application/ports/`.
 * Adapters under `infrastructure/adapters/persistence/` bind ports to Prisma.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ANALYTICS_RECORDER,
  InitializeAnalyticsOnUserRegisteredHandler,
  ResumeCreatedHandler,
  ResumeUpdatedHandler,
  SyncProjectionOnResumeCreatedHandler,
  SyncProjectionOnResumeDeletedHandler,
  SyncProjectionOnSectionAddedHandler,
  SyncProjectionOnSectionRemovedHandler,
  SyncProjectionOnSectionUpdatedHandler,
  VIEW_TRACKER,
} from '../application/handlers';
import { ANALYTICS_PROJECTION_PORT } from '../application/ports/analytics-projection.port';
import {
  AnalyticsProjectionAdapter,
  AnalyticsRecorderAdapter,
  ViewTrackerAdapter,
} from '../infrastructure/adapters';
import { ANALYTICS_EVENT_BUS_PORT } from './application/ports/analytics-event-bus.port';
import { AtsScoringPort } from './application/ports/facade.ports';
import {
  AtsScoreCatalogPort,
  BenchmarkRepositoryPort,
  SnapshotRepositoryPort,
  ViewTrackingRepositoryPort,
} from './application/ports/resume-analytics.port';
import { AnalyticsSseController } from './controllers/analytics-sse.controller';
import { ResumeAnalyticsController } from './controllers/resume-analytics.controller';
import { PrismaAtsScoreCatalogRepository } from './infrastructure/adapters/persistence/ats-score-catalog.repository';
import { PrismaBenchmarkRepository } from './infrastructure/adapters/persistence/benchmark.repository';
import { EventEmitterAnalyticsEventBusAdapter } from './infrastructure/adapters/persistence/event-emitter-analytics-event-bus.adapter';
import { PrismaSnapshotRepository } from './infrastructure/adapters/persistence/snapshot.repository';
import { PrismaViewTrackingRepository } from './infrastructure/adapters/persistence/view-tracking.repository';
import { SNAPSHOT_PORT, VIEW_TRACKING_PORT } from './ports';
import { ATSScoreService } from './services/ats-score.service';
import { BenchmarkService } from './services/benchmark.service';
import { DashboardService } from './services/dashboard.service';
import { KeywordAnalysisService } from './services/keyword-analysis.service';
import { ResumeAnalyticsFacade } from './services/resume-analytics.facade';
import { SnapshotService } from './services/snapshot.service';
import { ViewTrackingService } from './services/view-tracking.service';
import { ViewsProjectionWorker } from './workers/views-projection.worker';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeAnalyticsController, AnalyticsSseController],
  providers: [
    // Domain Services
    ResumeAnalyticsFacade,
    ViewTrackingService,
    ATSScoreService,
    KeywordAnalysisService,
    BenchmarkService,
    SnapshotService,
    DashboardService,
    // Event Handlers
    ResumeCreatedHandler,
    ResumeUpdatedHandler,
    InitializeAnalyticsOnUserRegisteredHandler,
    SyncProjectionOnResumeCreatedHandler,
    SyncProjectionOnResumeDeletedHandler,
    SyncProjectionOnSectionAddedHandler,
    SyncProjectionOnSectionUpdatedHandler,
    SyncProjectionOnSectionRemovedHandler,
    // Workers
    ViewsProjectionWorker,
    // Port Adapters (infrastructure)
    {
      provide: ANALYTICS_PROJECTION_PORT,
      useClass: AnalyticsProjectionAdapter,
    },
    {
      provide: ANALYTICS_RECORDER,
      useClass: AnalyticsRecorderAdapter,
    },
    {
      provide: VIEW_TRACKER,
      useClass: ViewTrackerAdapter,
    },
    {
      provide: ANALYTICS_EVENT_BUS_PORT,
      useClass: EventEmitterAnalyticsEventBusAdapter,
    },
    {
      provide: ViewTrackingRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaViewTrackingRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: SnapshotRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaSnapshotRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: BenchmarkRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaBenchmarkRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: AtsScoreCatalogPort,
      useFactory: (prisma: PrismaService) => new PrismaAtsScoreCatalogRepository(prisma),
      inject: [PrismaService],
    },
    // Dashboard Ports
    {
      provide: VIEW_TRACKING_PORT,
      useExisting: ViewTrackingService,
    },
    {
      provide: SNAPSHOT_PORT,
      useExisting: SnapshotService,
    },
    {
      provide: AtsScoringPort,
      useExisting: ATSScoreService,
    },
  ],
  exports: [ResumeAnalyticsFacade],
})
export class ResumeAnalyticsModule {}
