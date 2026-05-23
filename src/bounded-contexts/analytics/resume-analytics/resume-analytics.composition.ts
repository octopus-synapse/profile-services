/**
 * Pure-TS wiring for the resume-analytics BC. Zero `@nestjs/*` imports.
 *
 * Returns a `BoundedContextComposition` whose `useCases` bundle is the
 * `ResumeAnalyticsFacade` (the routes' bundle token). Two side
 * artefacts come along for the ride because the BC also serves SSE
 * routes off a different bundle token (`AnalyticsSseBundle`) and
 * registers handlers/cron against shared kernel ports:
 *
 *   - `sseBundle`            — wired to `SseStreamPort.subscribe(...)`
 *   - `registerHandlers(...)` — wires resume/section events to the
 *                               framework-free POJO handlers
 *   - `registerCron(...)`    — schedules the views-projection worker
 *
 * The Nest module shell (`resume-analytics.module.ts`) consumes these
 * via `useFactory`; the Elysia bootstrap will call them directly once
 * the BC is added to the POC.
 */

import { map, merge } from 'rxjs';
import type { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  DistributedLockPort,
  EventBusPort,
  EventPublisher,
  LoggerPort,
} from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import type { CronPort } from '@/shared-kernel/jobs/cron.port';
import {
  type ResumeAnalyticsHandlersDeps,
  registerResumeAnalyticsHandlers,
} from '../application/handlers/register-handlers';
import { AnalyticsRecorder } from '../application/handlers/resume-created.handler';
import { ViewTracker } from '../application/handlers/resume-updated.handler';
import type { AnalyticsProjectionPort } from '../application/ports/analytics-projection.port';
import { PrismaAtsScoreCatalogRepository } from './infrastructure/adapters/persistence/ats-score-catalog.repository';
import { PrismaBenchmarkRepository } from './infrastructure/adapters/persistence/benchmark.repository';
import { EventEmitterAnalyticsEventBusAdapter } from './infrastructure/adapters/persistence/event-emitter-analytics-event-bus.adapter';
import { PrismaSnapshotRepository } from './infrastructure/adapters/persistence/snapshot.repository';
import { PrismaViewTrackingRepository } from './infrastructure/adapters/persistence/view-tracking.repository';
import {
  AnalyticsSseBundle,
  type AnalyticsUpdateEvent,
  resumeAnalyticsRoutes,
} from './resume-analytics.routes';
import { ATSScoreService } from './services/ats-score.service';
import { BenchmarkService } from './services/benchmark.service';
import { DashboardService } from './services/dashboard.service';
import { KeywordAnalysisService } from './services/keyword-analysis.service';
import { ResumeAnalyticsFacade } from './services/resume-analytics.facade';
import { SnapshotService } from './services/snapshot.service';
import { ViewTrackingService } from './services/view-tracking.service';
import { ViewsProjectionWorker } from './workers/views-projection.worker';

export { ResumeAnalyticsFacade };

export interface ResumeAnalyticsHandlerCollaborators {
  readonly recorder: AnalyticsRecorder;
  readonly tracker: ViewTracker;
  readonly projection: AnalyticsProjectionPort;
  readonly idempotency: IdempotencyService;
}

export interface ResumeAnalyticsComposition
  extends BoundedContextComposition<ResumeAnalyticsFacade> {
  readonly useCases: ResumeAnalyticsFacade;
  /** Wraps `SseStreamPort.subscribe` channels into the SSE bundle the
   * `resumeAnalyticsSseRoutes` consume. */
  readonly sseBundle: AnalyticsSseBundle;
  /** Wires resume/section domain events to the BC's framework-free
   * handlers. Bootstrap calls this once after construction. */
  readonly registerHandlers: (collaborators: ResumeAnalyticsHandlerCollaborators) => void;
  /** Schedules the daily views-projection cron (`30 0 * * *`). */
  readonly registerCron: (cron: CronPort, lock: DistributedLockPort) => void;
}

/**
 * Build the SSE bundle from a `SseStreamPort`. Identical to the
 * factory the legacy Nest module embedded inline; lifted here so the
 * Elysia bootstrap can reuse it without copy-paste.
 */
export function buildAnalyticsSseBundle(sseStream: SseStreamPort): AnalyticsSseBundle {
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

/**
 * Build the resume-analytics facade and all collaborating services as
 * POJOs. Called by both the Nest module shell (via `useFactory`) and the
 * Elysia bootstrap — the bundle returned is shared singleton-style.
 */
export function buildResumeAnalyticsFacade(
  prisma: PrismaService,
  sseStream: SseStreamPort,
  eventPublisher: EventPublisher,
  config: ConfigPort,
): ResumeAnalyticsFacade {
  const analyticsEventBus = new EventEmitterAnalyticsEventBusAdapter(sseStream);
  const catalogRepo = new PrismaAtsScoreCatalogRepository(prisma);
  const benchmarkRepo = new PrismaBenchmarkRepository(prisma);
  const snapshotRepo = new PrismaSnapshotRepository(prisma);
  const viewTrackingRepo = new PrismaViewTrackingRepository(prisma);

  const viewTracking = new ViewTrackingService(viewTrackingRepo, analyticsEventBus, config);
  const atsScore = new ATSScoreService(catalogRepo, analyticsEventBus);
  const keywordAnalysis = new KeywordAnalysisService();
  const benchmark = new BenchmarkService(benchmarkRepo);
  const snapshot = new SnapshotService(snapshotRepo);
  // Dashboard uses ViewTrackingPort/AtsScoringPort/SnapshotPort which the
  // *Service classes structurally satisfy (the legacy Nest module wired
  // these via `useExisting`; structural typing keeps that contract here).
  const dashboard = new DashboardService(viewTracking, atsScore, snapshot);

  return new ResumeAnalyticsFacade(
    prisma,
    eventPublisher,
    viewTracking,
    atsScore,
    keywordAnalysis,
    benchmark,
    snapshot,
    dashboard,
  );
}

/**
 * Full BC composition. Owns the facade (the routes' bundle), the SSE
 * bundle factory, the handler-registration side-effect, and the cron
 * registration. The Nest module shell drains all four; the Elysia
 * bootstrap will too once this BC is wired in.
 */
export function buildResumeAnalyticsComposition(
  prisma: PrismaService,
  sseStream: SseStreamPort,
  eventPublisher: EventPublisher,
  eventBus: EventBusPort,
  logger: LoggerPort,
  config: ConfigPort,
): ResumeAnalyticsComposition {
  const facade = buildResumeAnalyticsFacade(prisma, sseStream, eventPublisher, config);
  const sseBundle = buildAnalyticsSseBundle(sseStream);

  return {
    useCases: facade,
    routes: resumeAnalyticsRoutes,
    sseBundle,
    registerHandlers: (collaborators) => {
      const deps: ResumeAnalyticsHandlersDeps = {
        eventBus,
        recorder: collaborators.recorder,
        tracker: collaborators.tracker,
        projection: collaborators.projection,
        idempotency: collaborators.idempotency,
        logger,
      };
      registerResumeAnalyticsHandlers(deps);
    },
    registerCron: (cron, lock) => {
      const worker = new ViewsProjectionWorker(prisma, logger, lock);
      // Daily 00:30 UTC — rolls up yesterday's view events.
      cron.register({ pattern: '30 0 * * *' }, worker.run.bind(worker));
    },
  };
}
