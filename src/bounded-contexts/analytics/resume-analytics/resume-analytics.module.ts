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
import { map, merge } from 'rxjs';
import { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusPort, LoggerPort } from '@/shared-kernel';
import { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import { CronPort } from '@/shared-kernel/jobs/cron.port';
import { registerResumeAnalyticsHandlers } from '../application/handlers/register-handlers';
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

function makeAnalyticsSseBundle(sseStream: SseStreamPort): AnalyticsSseBundle {
  return {
    subscribeToResumeAnalytics: (resumeId) => {
      const viewEvents = sseStream.subscribe<AnalyticsUpdateEvent>(`analytics:${resumeId}:view`);
      const atsScoreEvents = sseStream.subscribe<AnalyticsUpdateEvent>(
        `analytics:${resumeId}:ats_score`,
      );
      return merge(viewEvents, atsScoreEvents).pipe(
        map(({ data: event }) => ({
          data: event,
          id: `${resumeId}-${Date.now()}`,
          type: event.type,
          retry: 10000,
        })),
      );
    },
    subscribeToViews: (resumeId) =>
      sseStream.subscribe<AnalyticsUpdateEvent>(`analytics:${resumeId}:view`).pipe(
        map(({ data: event }) => ({
          data: event,
          id: `${resumeId}-view-${Date.now()}`,
          type: 'view',
          retry: 10000,
        })),
      ),
    subscribeToAtsScore: (resumeId) =>
      sseStream.subscribe<AnalyticsUpdateEvent>(`analytics:${resumeId}:ats_score`).pipe(
        map(({ data: event }) => ({
          data: event,
          id: `${resumeId}-ats-${Date.now()}`,
          type: 'ats_score',
          retry: 10000,
        })),
      ),
  };
}

@Module({
  imports: [PrismaModule, CacheModule],
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
    // Side-effect provider: register framework-free handlers via EventBusPort.
    {
      provide: 'RESUME_ANALYTICS_HANDLERS_REGISTERED',
      useFactory: (
        eventBus: EventBusPort,
        recorder: AnalyticsRecorder,
        tracker: ViewTracker,
        projection: AnalyticsProjectionPort,
        idempotency: IdempotencyService,
        logger: LoggerPort,
      ): boolean => {
        registerResumeAnalyticsHandlers({
          eventBus,
          recorder,
          tracker,
          projection,
          idempotency,
          logger,
        });
        return true;
      },
      inject: [
        EventBusPort,
        AnalyticsRecorder,
        ViewTracker,
        AnalyticsProjectionPort,
        IdempotencyService,
        LoggerPort,
      ],
    },
    // Workers — registered as side-effect against the global CronPort.
    {
      provide: 'RESUME_ANALYTICS_JOBS_REGISTERED',
      useFactory: (cron: CronPort, prisma: PrismaService, logger: LoggerPort) => {
        const worker = new ViewsProjectionWorker(prisma, logger);
        // Daily 00:30 UTC — rolls up yesterday's view events.
        cron.register({ pattern: '30 0 * * *' }, worker.run.bind(worker));
        return true;
      },
      inject: [CronPort, PrismaService, LoggerPort],
    },
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
      useFactory: (sseStream: SseStreamPort) => makeAnalyticsSseBundle(sseStream),
      inject: [SseStreamPort],
    },
  ],
  exports: [ResumeAnalyticsFacade],
})
export class ResumeAnalyticsModule {}
