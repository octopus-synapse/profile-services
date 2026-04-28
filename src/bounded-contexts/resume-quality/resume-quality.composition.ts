/**
 * Pure-TS wiring for the resume-quality BC. Zero `@nestjs/*` imports —
 * the Nest module is a thin shell that exposes the result of this
 * function through `useFactory` providers.
 *
 * Phase-1 canonical shape: `buildResumeQualityComposition(...)` returns
 * `{ useCases, routes, eventHandlers, workers }` as a
 * `BoundedContextComposition`. The Elysia bootstrap registers
 * `eventHandlers` against the `EventBusPort` and `workers` against the
 * `JobQueuePort`; the Nest shell does the same via side-effect
 * providers.
 */

import type { ScoringLlmPort } from '@/bounded-contexts/ai/domain/ports/scoring-llm.port';
import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes/domain/events';
import type { EventPublisher, LoggerPort } from '@/shared-kernel';
import type {
  BcEventBinding,
  BcWorkerBinding,
  BoundedContextComposition,
} from '@/shared-kernel/composition';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { ResumeQualityUseCases } from './application/ports/resume-quality.port';
import { ComputeQualityUseCase } from './application/use-cases/compute-quality.use-case';
import { GetLatestQualityUseCase } from './application/use-cases/get-latest-quality.use-case';
import type { ContentQualityPort } from './domain/ports/content-quality.port';
import type { QualityScoreRepositoryPort } from './domain/ports/quality-score.repository.port';
import type { ResumeLoaderPort } from './domain/ports/resume-loader.port';
import { AiContentQualityAdapter } from './infrastructure/adapters/ai-content-quality.adapter';
import { PrismaQualityScoreRepository } from './infrastructure/adapters/persistence/prisma-quality-score.repository';
import { PrismaResumeLoader } from './infrastructure/adapters/persistence/prisma-resume-loader.adapter';
import { ResumeQualityOnResumeUpdatedHandler } from './infrastructure/handlers/resume-quality-on-resume-updated.handler';
import {
  RESUME_QUALITY_QUEUE,
  type ResumeQualityJobData,
  ResumeQualityWorker,
} from './infrastructure/workers/resume-quality.worker';
import { resumeQualityRoutes } from './resume-quality.routes';

export { ResumeQualityUseCases };

export function buildResumeQualityUseCases(
  resumeLoader: ResumeLoaderPort,
  contentQuality: ContentQualityPort,
  repository: QualityScoreRepositoryPort,
  events: EventPublisher,
  logger: LoggerPort,
): ResumeQualityUseCases {
  return {
    computeQuality: new ComputeQualityUseCase(
      resumeLoader,
      contentQuality,
      repository,
      events,
      logger,
    ),
    getLatestQuality: new GetLatestQualityUseCase(repository),
  };
}

/**
 * Build the framework-free composition for the resume-quality BC.
 *
 * The bootstrap is responsible for:
 *  - mounting `routes` (HTTP) against `useCases`,
 *  - calling `eventBus.on(b.eventType, b.handler)` for each
 *    `eventHandlers` entry — replaces the original `@OnEvent` decorator,
 *  - calling `queue.register(b.queue, b.process)` for each `workers`
 *    entry.
 */
export function buildResumeQualityComposition(
  prisma: PrismaService,
  scoringLlm: ScoringLlmPort,
  flags: FeatureFlagService,
  events: EventPublisher,
  logger: LoggerPort,
  queue: JobQueuePort,
): BoundedContextComposition<ResumeQualityUseCases> {
  const resumeLoader = new PrismaResumeLoader(prisma);
  const contentQuality = new AiContentQualityAdapter(scoringLlm, flags, logger);
  const repository = new PrismaQualityScoreRepository(prisma, logger);

  const useCases = buildResumeQualityUseCases(
    resumeLoader,
    contentQuality,
    repository,
    events,
    logger,
  );

  // --- Event handler (POJO @OnEvent replacement) ---
  // `ResumeUpdatedEvent.TYPE` → enqueue a recompute job.
  const onResumeUpdated = new ResumeQualityOnResumeUpdatedHandler(queue, logger);

  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    {
      eventType: ResumeUpdatedEvent.TYPE,
      handler: onResumeUpdated.onResumeUpdated.bind(onResumeUpdated),
    },
  ];

  // --- Workers (BullMQ-shaped queue processor) ---
  const recomputeWorker = new ResumeQualityWorker(useCases.computeQuality, logger);

  const workers: ReadonlyArray<BcWorkerBinding> = [
    {
      queue: RESUME_QUALITY_QUEUE,
      process: recomputeWorker.process.bind(
        recomputeWorker,
      ) as BcWorkerBinding<ResumeQualityJobData>['process'] as BcWorkerBinding['process'],
    },
  ];

  return {
    useCases,
    routes: resumeQualityRoutes,
    eventHandlers,
    workers,
  };
}
