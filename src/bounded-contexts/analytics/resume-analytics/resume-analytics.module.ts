/**
 * Resume Analytics Module
 *
 * Architecture: Clean Architecture / Hexagonal.
 * Services depend on ports defined in `application/ports/`.
 * Adapters under `infrastructure/adapters/persistence/` bind ports to Prisma.
 *
 * The SSE streams are synthesized from `kind: 'sse'` Route descriptors
 * (`resumeAnalyticsSseRoutes`) wired through `AnalyticsSseBundle`.
 */

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, map, merge } from 'rxjs';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import {
  InitializeAnalyticsOnUserRegisteredHandler,
  ResumeCreatedHandler,
  ResumeUpdatedHandler,
  SyncProjectionOnResumeCreatedHandler,
  SyncProjectionOnResumeDeletedHandler,
  SyncProjectionOnSectionAddedHandler,
  SyncProjectionOnSectionRemovedHandler,
  SyncProjectionOnSectionUpdatedHandler,
} from '../application/handlers';
import { AnalyticsRecorder } from '../application/handlers/resume-created.handler';
import { ViewTracker } from '../application/handlers/resume-updated.handler';
import { AnalyticsProjectionPort } from '../application/ports/analytics-projection.port';
import {
  AnalyticsProjectionAdapter,
  AnalyticsRecorderAdapter,
  ViewTrackerAdapter,
} from '../infrastructure/adapters';
import { AnalyticsEventBusPort } from './application/ports/analytics-event-bus.port';
import { AtsScoringPort } from './application/ports/facade.ports';
import {
  AtsScoreCatalogPort,
  BenchmarkRepositoryPort,
  SnapshotRepositoryPort,
  ViewTrackingRepositoryPort,
} from './application/ports/resume-analytics.port';
import { PrismaAtsScoreCatalogRepository } from './infrastructure/adapters/persistence/ats-score-catalog.repository';
import { PrismaBenchmarkRepository } from './infrastructure/adapters/persistence/benchmark.repository';
import { EventEmitterAnalyticsEventBusAdapter } from './infrastructure/adapters/persistence/event-emitter-analytics-event-bus.adapter';
import { PrismaSnapshotRepository } from './infrastructure/adapters/persistence/snapshot.repository';
import { PrismaViewTrackingRepository } from './infrastructure/adapters/persistence/view-tracking.repository';
import { SnapshotPort, ViewTrackingPort } from './ports/dashboard.ports';
import {
  AnalyticsSseBundle,
  type AnalyticsUpdateEvent,
  resumeAnalyticsRoutes,
  resumeAnalyticsSseRoutes,
} from './resume-analytics.routes';
import { ATSScoreService } from './services/ats-score.service';
import { BenchmarkService } from './services/benchmark.service';
import { DashboardService } from './services/dashboard.service';
import { KeywordAnalysisService } from './services/keyword-analysis.service';
import { ResumeAnalyticsFacade } from './services/resume-analytics.facade';
import { SnapshotService } from './services/snapshot.service';
import { ViewTrackingService } from './services/view-tracking.service';
import { ViewsProjectionWorker } from './workers/views-projection.worker';

function makeAnalyticsSseBundle(emitter: EventEmitter2): AnalyticsSseBundle {
  return {
    subscribeToResumeAnalytics: (resumeId) => {
      const viewEvents = fromEvent<AnalyticsUpdateEvent>(emitter, `analytics:${resumeId}:view`);
      const atsScoreEvents = fromEvent<AnalyticsUpdateEvent>(
        emitter,
        `analytics:${resumeId}:ats_score`,
      );
      return merge(viewEvents, atsScoreEvents).pipe(
        map((event) => ({
          data: event,
          id: `${resumeId}-${Date.now()}`,
          type: event.type,
          retry: 10000,
        })),
      );
    },
    subscribeToViews: (resumeId) =>
      fromEvent<AnalyticsUpdateEvent>(emitter, `analytics:${resumeId}:view`).pipe(
        map((event) => ({
          data: event,
          id: `${resumeId}-view-${Date.now()}`,
          type: 'view',
          retry: 10000,
        })),
      ),
    subscribeToAtsScore: (resumeId) =>
      fromEvent<AnalyticsUpdateEvent>(emitter, `analytics:${resumeId}:ats_score`).pipe(
        map((event) => ({
          data: event,
          id: `${resumeId}-ats-${Date.now()}`,
          type: 'ats_score',
          retry: 10000,
        })),
      ),
  };
}

@Module({
  imports: [PrismaModule],
  controllers: [
    ...synthesizeRouteControllers(ResumeAnalyticsFacade, resumeAnalyticsRoutes),
    ...synthesizeRouteControllers(AnalyticsSseBundle, resumeAnalyticsSseRoutes),
  ],
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
    { provide: AnalyticsProjectionPort, useClass: AnalyticsProjectionAdapter },
    { provide: AnalyticsRecorder, useClass: AnalyticsRecorderAdapter },
    { provide: ViewTracker, useClass: ViewTrackerAdapter },
    { provide: AnalyticsEventBusPort, useClass: EventEmitterAnalyticsEventBusAdapter },
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
    { provide: ViewTrackingPort, useExisting: ViewTrackingService },
    { provide: SnapshotPort, useExisting: SnapshotService },
    { provide: AtsScoringPort, useExisting: ATSScoreService },
    // SSE bundle
    {
      provide: AnalyticsSseBundle,
      useFactory: (emitter: EventEmitter2) => makeAnalyticsSseBundle(emitter),
      inject: [EventEmitter2],
    },
  ],
  exports: [ResumeAnalyticsFacade],
})
export class ResumeAnalyticsModule {}
