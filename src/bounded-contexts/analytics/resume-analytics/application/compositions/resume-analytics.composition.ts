/**
 * Resume Analytics Composition
 *
 * Wires use cases with their dependencies following Clean Architecture.
 */

import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisher } from '@/shared-kernel';
import { PrismaAtsScoreCatalogRepository } from '../../infrastructure/adapters/persistence/ats-score-catalog.repository';
import { PrismaBenchmarkRepository } from '../../infrastructure/adapters/persistence/benchmark.repository';
import { EventEmitterAnalyticsEventBusAdapter } from '../../infrastructure/adapters/persistence/event-emitter-analytics-event-bus.adapter';
import { PrismaResumeOwnershipRepository } from '../../infrastructure/adapters/persistence/resume-ownership.repository';
import { PrismaSnapshotRepository } from '../../infrastructure/adapters/persistence/snapshot.repository';
import { PrismaViewTrackingRepository } from '../../infrastructure/adapters/persistence/view-tracking.repository';
import {
  RESUME_ANALYTICS_USE_CASES,
  type ResumeAnalyticsUseCases,
} from '../ports/resume-analytics.port';
import { AnalyzeKeywordsUseCase } from '../use-cases/analyze-keywords/analyze-keywords.use-case';
import { BuildAnalyticsDashboardUseCase } from '../use-cases/build-analytics-dashboard/build-analytics-dashboard.use-case';
import { CalculateAtsScoreUseCase } from '../use-cases/calculate-ats-score/calculate-ats-score.use-case';
import { GetIndustryBenchmarkUseCase } from '../use-cases/get-industry-benchmark/get-industry-benchmark.use-case';
import { GetScoreProgressionUseCase } from '../use-cases/get-score-progression/get-score-progression.use-case';
import { GetSnapshotHistoryUseCase } from '../use-cases/get-snapshot-history/get-snapshot-history.use-case';
import { GetViewStatsUseCase } from '../use-cases/get-view-stats/get-view-stats.use-case';
import { SaveSnapshotUseCase } from '../use-cases/save-snapshot/save-snapshot.use-case';
import { TrackViewUseCase } from '../use-cases/track-view/track-view.use-case';

export { RESUME_ANALYTICS_USE_CASES };

export function buildResumeAnalyticsUseCases(
  prisma: PrismaService,
  eventEmitter: EventEmitter2,
  eventPublisher: EventPublisher,
): ResumeAnalyticsUseCases {
  // Infrastructure adapters
  const catalogRepo = new PrismaAtsScoreCatalogRepository(prisma);
  const benchmarkRepo = new PrismaBenchmarkRepository(prisma);
  const snapshotRepo = new PrismaSnapshotRepository(prisma);
  const viewTrackingRepo = new PrismaViewTrackingRepository(prisma);
  const ownershipRepo = new PrismaResumeOwnershipRepository(prisma);
  const analyticsEventBus = new EventEmitterAnalyticsEventBusAdapter(eventEmitter);

  // Use cases
  const calculateAtsScoreUseCase = new CalculateAtsScoreUseCase(
    catalogRepo,
    ownershipRepo,
    analyticsEventBus,
    eventPublisher,
  );

  const getViewStatsUseCase = new GetViewStatsUseCase(ownershipRepo, viewTrackingRepo);

  const getIndustryBenchmarkUseCase = new GetIndustryBenchmarkUseCase(
    benchmarkRepo,
    ownershipRepo,
    calculateAtsScoreUseCase,
  );

  const buildAnalyticsDashboardUseCase = new BuildAnalyticsDashboardUseCase(
    ownershipRepo,
    getViewStatsUseCase,
    calculateAtsScoreUseCase,
    snapshotRepo,
  );

  const analyzeKeywordsUseCase = new AnalyzeKeywordsUseCase(ownershipRepo);

  const saveSnapshotUseCase = new SaveSnapshotUseCase(
    ownershipRepo,
    snapshotRepo,
    calculateAtsScoreUseCase,
  );

  const getSnapshotHistoryUseCase = new GetSnapshotHistoryUseCase(ownershipRepo, snapshotRepo);

  const getScoreProgressionUseCase = new GetScoreProgressionUseCase(ownershipRepo, snapshotRepo);

  const trackViewUseCase = new TrackViewUseCase(ownershipRepo, viewTrackingRepo, analyticsEventBus);

  return {
    calculateAtsScoreUseCase,
    getIndustryBenchmarkUseCase,
    buildAnalyticsDashboardUseCase,
    analyzeKeywordsUseCase,
    saveSnapshotUseCase,
    getSnapshotHistoryUseCase,
    getScoreProgressionUseCase,
    trackViewUseCase,
    getViewStatsUseCase,
    getIndustryBenchmarks: (industry?: string) =>
      getIndustryBenchmarkUseCase.getIndustryBenchmarks(industry),
  };
}
