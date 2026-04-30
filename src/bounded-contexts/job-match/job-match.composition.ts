/**
 * Pure-TS wiring for the job-match BC. Zero `@nestjs/*` imports.
 *
 * job-match owns the Match Score. The BC's only routed use case is
 * `ComputeMatchUseCase` (the routes' bundle token). Side artefacts
 * the bootstrap consumes:
 *
 *  - `eventHandlers` — the `ResumeUpdated` POJO listener fans into
 *    the `job-match-recompute` queue for cache invalidation.
 *  - `workers`       — the recompute worker (queue: `job-match-recompute`)
 *    and the daily-recommendations worker (queue: `daily-recommendations`).
 *  - `lifecycles`    — schedules the daily-recommendations cron tick
 *    via `JobQueuePort.schedule(...)` repeat semantics.
 *
 * Cross-BC deps (the bootstrap injects already-built collaborators):
 *  - `SimilarityPort` from `fit-profile/`.
 *  - `NotificationsUseCases` from `notifications/`.
 *  - AI ports (`ScoringLlmPort`, `EmbeddingsPort`) from `ai/`.
 *  - `FeatureFlagService` from `platform/feature-flags/`.
 *  - `CacheService` from `platform/common/cache/`.
 */

import type { EmbeddingsPort } from '@/bounded-contexts/ai/domain/ports/embeddings.port';
import type { ScoringLlmPort } from '@/bounded-contexts/ai/domain/ports/scoring-llm.port';
import type { SimilarityPort } from '@/bounded-contexts/fit-profile/domain/ports/similarity.port';
import type { NotificationsUseCases } from '@/bounded-contexts/notifications/application/ports/notifications.port';
import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import type { EventBusPort, EventPublisher, LoggerPort } from '@/shared-kernel';
import type {
  BcEventBinding,
  BcWorkerBinding,
  BoundedContextComposition,
} from '@/shared-kernel/composition';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import { ComputeMatchUseCase } from './application/use-cases/compute-match.use-case';
import { AiRequirementsMatcherAdapter } from './infrastructure/adapters/ai-requirements-matcher.adapter';
import { AiSemanticMatcherAdapter } from './infrastructure/adapters/ai-semantic-matcher.adapter';
import { PrismaResumeKeywordSource } from './infrastructure/adapters/keyword-matcher.adapter';
import { PrismaJobLoader } from './infrastructure/adapters/persistence/prisma-job-loader.repository';
import { PrismaResumeExistence } from './infrastructure/adapters/persistence/prisma-resume-existence.repository';
import { PrismaUserFitStateAdapter } from './infrastructure/adapters/persistence/prisma-user-fit-state.repository';
import { RedisMatchCacheAdapter } from './infrastructure/adapters/redis-match-cache.adapter';
import { JobMatchRecomputeOnResumeUpdatedHandler } from './infrastructure/handlers/job-match-recompute-on-resume-updated.handler';
import {
  DAILY_RECOMMENDATIONS_QUEUE,
  type DailyRecommendationsJobData,
  DailyRecommendationsWorker,
} from './infrastructure/workers/daily-recommendations.worker';
import {
  JOB_MATCH_RECOMPUTE_QUEUE,
  JobMatchRecomputeWorker,
} from './infrastructure/workers/job-match-recompute.worker';
import { jobMatchRoutes } from './job-match.routes';

export { ComputeMatchUseCase };

export interface JobMatchDeps {
  readonly prisma: PrismaService;
  readonly cache: CacheService;
  readonly flags: FeatureFlagService;
  readonly embeddings: EmbeddingsPort;
  readonly scoringLlm: ScoringLlmPort;
  readonly similarity: SimilarityPort;
  readonly notifications: NotificationsUseCases;
  readonly eventBus: EventBusPort;
  readonly eventPublisher: EventPublisher;
  readonly queue: JobQueuePort;
  readonly logger: LoggerPort;
}

export function buildJobMatchUseCases(deps: JobMatchDeps): ComputeMatchUseCase {
  const { prisma, cache, flags, embeddings, scoringLlm, similarity, eventPublisher, logger } = deps;

  const resumeExistence = new PrismaResumeExistence(prisma);
  const jobLoader = new PrismaJobLoader(prisma, logger);
  const fitState = new PrismaUserFitStateAdapter(prisma);
  const keywordSource = new PrismaResumeKeywordSource(prisma);
  const requirementsMatcher = new AiRequirementsMatcherAdapter(scoringLlm, prisma, logger);
  const semanticMatcher = new AiSemanticMatcherAdapter(embeddings, cache, prisma, flags, logger);
  const matchCache = new RedisMatchCacheAdapter(cache, logger);

  return new ComputeMatchUseCase(
    resumeExistence,
    jobLoader,
    fitState,
    keywordSource,
    requirementsMatcher,
    semanticMatcher,
    similarity,
    matchCache,
    eventPublisher,
    logger,
  );
}

/**
 * Build the framework-free composition for the job-match BC.
 *
 * The bootstrap is responsible for:
 *  - mounting `routes` against `useCases` (`ComputeMatchUseCase`),
 *  - calling `eventBus.on(b.eventType, b.handler)` for each
 *    `eventHandlers` entry,
 *  - calling `queue.register(b.queue, b.process)` for each `workers`
 *    entry,
 *  - awaiting `lifecycles[i].init()` in declaration order at boot
 *    (`queue.schedule` repeat tick for daily recommendations).
 */
export function buildJobMatchComposition(
  deps: JobMatchDeps,
): BoundedContextComposition<ComputeMatchUseCase> {
  const computeMatch = buildJobMatchUseCases(deps);

  // --- Event handlers (POJO `@OnEvent` replacements) ---
  const recomputeOnResumeUpdated = new JobMatchRecomputeOnResumeUpdatedHandler(
    deps.queue,
    deps.logger,
  );

  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    {
      eventType: ResumeUpdatedEvent.TYPE,
      handler: recomputeOnResumeUpdated.onResumeUpdated.bind(recomputeOnResumeUpdated),
    },
  ];

  // --- Workers (BullMQ-shaped queue processors) ---
  const recomputeWorker = new JobMatchRecomputeWorker(deps.cache, deps.logger);
  const dailyWorker = new DailyRecommendationsWorker(
    deps.prisma,
    deps.flags,
    computeMatch,
    deps.notifications,
    deps.queue,
    deps.logger,
  );

  const workers: ReadonlyArray<BcWorkerBinding> = [
    {
      queue: JOB_MATCH_RECOMPUTE_QUEUE,
      process: recomputeWorker.process.bind(recomputeWorker) as BcWorkerBinding['process'],
    },
    {
      queue: DAILY_RECOMMENDATIONS_QUEUE,
      process: dailyWorker.process.bind(dailyWorker) as BcWorkerBinding['process'],
    },
  ];

  // --- Lifecycle: schedule the daily-recommendations cron tick ---
  const lifecycles: ReadonlyArray<Lifecycle> = [
    {
      init: async (): Promise<void> => {
        // Every 3 days at 04:00 America/Sao_Paulo. Offset from the
        // fit-profile-expire cron (03:00) so the two workers don't
        // compete for the same DB window.
        await deps.queue.schedule<DailyRecommendationsJobData>(
          DAILY_RECOMMENDATIONS_QUEUE,
          { kind: 'schedule' },
          {
            repeat: { pattern: '0 4 */3 * *', tz: 'America/Sao_Paulo' },
            jobId: 'daily-recommendations-schedule-cron',
          },
        );
      },
    },
  ];

  // `eventBus` is part of the canonical signature but the bootstrap is
  // the one that calls `eventBus.on(...)` from the returned
  // `eventHandlers` bindings — keep the param so cross-BC composition
  // call sites stay symmetric.
  void deps.eventBus;

  return {
    useCases: computeMatch,
    routes: jobMatchRoutes,
    eventHandlers,
    workers,
    lifecycles,
  };
}
