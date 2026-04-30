/**
 * Resume Analytics Composition
 *
 * Wires use cases with their dependencies following Clean Architecture.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisher, LoggerPort } from '@/shared-kernel';
import { PrismaAtsScoreCatalogRepository } from '../../infrastructure/adapters/persistence/ats-score-catalog.repository';
import { PrismaBenchmarkRepository } from '../../infrastructure/adapters/persistence/benchmark.repository';
import { PrismaResumeOwnershipRepository } from '../../infrastructure/adapters/persistence/resume-ownership.repository';
import { PrismaSnapshotRepository } from '../../infrastructure/adapters/persistence/snapshot.repository';
import { PrismaViewTrackingRepository } from '../../infrastructure/adapters/persistence/view-tracking.repository';
import type { AnalyticsEventBusPort } from '../ports/analytics-event-bus.port';
import { ResumeAnalyticsUseCases } from '../ports/resume-analytics.port';
import { AnalyzeKeywordsUseCase } from '../use-cases/analyze-keywords/analyze-keywords.use-case';
import { BuildAnalyticsDashboardUseCase } from '../use-cases/build-analytics-dashboard/build-analytics-dashboard.use-case';
import { CalculateAtsScoreUseCase } from '../use-cases/calculate-ats-score/calculate-ats-score.use-case';
import { GetIndustryBenchmarkUseCase } from '../use-cases/get-industry-benchmark/get-industry-benchmark.use-case';
import { GetScoreProgressionUseCase } from '../use-cases/get-score-progression/get-score-progression.use-case';
import { GetSnapshotHistoryUseCase } from '../use-cases/get-snapshot-history/get-snapshot-history.use-case';
import { GetViewStatsUseCase } from '../use-cases/get-view-stats/get-view-stats.use-case';
import { SaveSnapshotUseCase } from '../use-cases/save-snapshot/save-snapshot.use-case';
import { TrackViewUseCase } from '../use-cases/track-view/track-view.use-case';

export { ResumeAnalyticsUseCases };

export function buildResumeAnalyticsUseCases(
  prisma: PrismaService,
  analyticsEventBus: AnalyticsEventBusPort,
  eventPublisher: EventPublisher,
  logger: LoggerPort,
): ResumeAnalyticsUseCases {
  // Infrastructure adapters
  const catalogRepo = new PrismaAtsScoreCatalogRepository(prisma);
  const benchmarkRepo = new PrismaBenchmarkRepository(prisma);
  const snapshotRepo = new PrismaSnapshotRepository(prisma);
  const viewTrackingRepo = new PrismaViewTrackingRepository(prisma);
  const ownershipRepo = new PrismaResumeOwnershipRepository(prisma);

  // Use cases
  const calculateAtsScoreUseCase = new CalculateAtsScoreUseCase(
    catalogRepo,
    ownershipRepo,
    analyticsEventBus,
    eventPublisher,
    logger,
  );

  const getViewStatsUseCase = new GetViewStatsUseCase(ownershipRepo, viewTrackingRepo, logger);

  const getIndustryBenchmarkUseCase = new GetIndustryBenchmarkUseCase(
    benchmarkRepo,
    ownershipRepo,
    calculateAtsScoreUseCase,
    logger,
  );

  const buildAnalyticsDashboardUseCase = new BuildAnalyticsDashboardUseCase(
    ownershipRepo,
    getViewStatsUseCase,
    calculateAtsScoreUseCase,
    snapshotRepo,
    logger,
  );

  const analyzeKeywordsUseCase = new AnalyzeKeywordsUseCase(ownershipRepo);

  const saveSnapshotUseCase = new SaveSnapshotUseCase(
    ownershipRepo,
    snapshotRepo,
    calculateAtsScoreUseCase,
    logger,
  );

  const getSnapshotHistoryUseCase = new GetSnapshotHistoryUseCase(
    ownershipRepo,
    snapshotRepo,
    logger,
  );

  const getScoreProgressionUseCase = new GetScoreProgressionUseCase(
    ownershipRepo,
    snapshotRepo,
    logger,
  );

  const trackViewUseCase = new TrackViewUseCase(
    ownershipRepo,
    viewTrackingRepo,
    analyticsEventBus,
    logger,
  );

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
