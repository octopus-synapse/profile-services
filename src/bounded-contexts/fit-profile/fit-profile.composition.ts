/**
 * Pure-TS wiring for the fit-profile BC. Zero `@nestjs/*` imports —
 * Phase-1 canonical shape: returns `{ useCases, routes }` as a
 * `BoundedContextComposition`.
 *
 * The repository adapters and the default `SimilarityPort` adapter
 * (`WeightedCosineSimilarityAdapter`) are POJOs instantiated here.
 * The composition also exposes the `SimilarityPort` instance and the
 * `ExpireFitProfileUseCase` so adjacent BCs (job-match, the BullMQ
 * worker) can consume them via the same `build*Composition` flow.
 *
 * The `RequireFitProfileGuard` lives in the Nest shell — it implements
 * `CanActivate` and is framework-bound by design (per the migration
 * plan).
 *
 * The nightly `FitProfileExpireWorker` is registered against the
 * shared `JobQueuePort` via `registerFitProfileJobs(...)` — a separate
 * export the bootstrap calls once `JobQueuePort` is available.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type EventPublisher, type LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { FitProfileUseCases } from './application/ports/fit-profile.port';
import { CreateFitQuestionUseCase } from './application/use-cases/create-fit-question.use-case';
import { DeleteFitProfileUseCase } from './application/use-cases/delete-fit-profile.use-case';
import { DeleteFitQuestionUseCase } from './application/use-cases/delete-fit-question.use-case';
import { ExpireFitProfileUseCase } from './application/use-cases/expire-fit-profile.use-case';
import { GetFitProfileStatusUseCase } from './application/use-cases/get-fit-profile-status.use-case';
import { GetFitQuestionUseCase } from './application/use-cases/get-fit-question.use-case';
import { GetJobFitProfileUseCase } from './application/use-cases/get-job-fit-profile.use-case';
import { GetOrCreateQuestionSetUseCase } from './application/use-cases/get-or-create-question-set.use-case';
import { ListFitAnswersUseCase } from './application/use-cases/list-fit-answers.use-case';
import { ListFitQuestionsUseCase } from './application/use-cases/list-fit-questions.use-case';
import { SubmitFitAnswersUseCase } from './application/use-cases/submit-fit-answers.use-case';
import { UpdateFitQuestionUseCase } from './application/use-cases/update-fit-question.use-case';
import { UpsertJobFitProfileUseCase } from './application/use-cases/upsert-job-fit-profile.use-case';
import type { JobFitProfileRepositoryPort } from './domain/ports/job-fit-profile.repository.port';
import type { SimilarityPort } from './domain/ports/similarity.port';
import type { UserFitProfileRepositoryPort } from './domain/ports/user-fit-profile.repository.port';
import { fitProfileRoutes } from './fit-profile.routes';
import { PrismaFitAnswerRepository } from './infrastructure/adapters/persistence/prisma-fit-answer.repository';
import { PrismaFitQuestionRepository } from './infrastructure/adapters/persistence/prisma-fit-question.repository';
import { PrismaFitQuestionSetRepository } from './infrastructure/adapters/persistence/prisma-fit-question-set.repository';
import { PrismaFitRemapHistoryRepository } from './infrastructure/adapters/persistence/prisma-fit-remap-history.repository';
import { PrismaJobFitProfileRepository } from './infrastructure/adapters/persistence/prisma-job-fit-profile.repository';
import { PrismaUserFitProfileRepository } from './infrastructure/adapters/persistence/prisma-user-fit-profile.repository';
import { WeightedCosineSimilarityAdapter } from './infrastructure/adapters/weighted-cosine-similarity.adapter';
import {
  FIT_PROFILE_EXPIRE_QUEUE,
  type FitProfileExpireJobData,
  FitProfileExpireWorker,
} from './infrastructure/workers/fit-profile-expire.worker';

export { FitProfileUseCases };

/** Extra surface exposed by the fit-profile BC beyond the use-case
 *  bundle: needed by the Nest shell (which still re-exports them as
 *  providers) and by the Elysia bootstrap (which hands `similarity` to
 *  job-match and `expireFitProfile` to the BullMQ worker). */
export interface FitProfileExtras {
  readonly similarity: SimilarityPort;
  readonly expireFitProfile: ExpireFitProfileUseCase;
  readonly userFitProfileRepository: UserFitProfileRepositoryPort;
  readonly jobFitProfileRepository: JobFitProfileRepositoryPort;
}

export interface FitProfileBuildResult {
  readonly useCases: FitProfileUseCases;
  readonly extras: FitProfileExtras;
}

export function buildFitProfileBundle(
  prisma: PrismaService,
  events: EventPublisher,
  logger: LoggerPort,
): FitProfileBuildResult {
  // Persistence adapters (POJOs)
  const fitQuestions = new PrismaFitQuestionRepository(prisma, logger);
  const fitQuestionSets = new PrismaFitQuestionSetRepository(prisma);
  const fitAnswers = new PrismaFitAnswerRepository(prisma);
  const userFitProfiles = new PrismaUserFitProfileRepository(prisma, logger);
  const jobFitProfiles = new PrismaJobFitProfileRepository(prisma, logger);
  const fitRemapHistory = new PrismaFitRemapHistoryRepository(prisma, logger);

  // Default similarity adapter
  const similarity = new WeightedCosineSimilarityAdapter(userFitProfiles, jobFitProfiles);

  // Use cases
  const expireFitProfile = new ExpireFitProfileUseCase(userFitProfiles, events, logger);

  const useCases: FitProfileUseCases = {
    getFitProfileStatus: new GetFitProfileStatusUseCase(userFitProfiles, fitQuestionSets, logger),
    getOrCreateQuestionSet: new GetOrCreateQuestionSetUseCase(
      fitQuestions,
      fitQuestionSets,
      logger,
    ),
    submitFitAnswers: new SubmitFitAnswersUseCase(
      fitQuestionSets,
      fitQuestions,
      fitAnswers,
      userFitProfiles,
      fitRemapHistory,
      events,
      logger,
    ),
    listFitAnswers: new ListFitAnswersUseCase(fitAnswers),
    deleteFitProfile: new DeleteFitProfileUseCase(fitAnswers, userFitProfiles, logger),
    upsertJobFitProfile: new UpsertJobFitProfileUseCase(jobFitProfiles, events, logger),
    getJobFitProfile: new GetJobFitProfileUseCase(jobFitProfiles),
    listFitQuestions: new ListFitQuestionsUseCase(fitQuestions),
    createFitQuestion: new CreateFitQuestionUseCase(fitQuestions),
    updateFitQuestion: new UpdateFitQuestionUseCase(fitQuestions),
    deleteFitQuestion: new DeleteFitQuestionUseCase(fitQuestions),
    getFitQuestion: new GetFitQuestionUseCase(fitQuestions),
  };

  return {
    useCases,
    extras: {
      similarity,
      expireFitProfile,
      userFitProfileRepository: userFitProfiles,
      jobFitProfileRepository: jobFitProfiles,
    },
  };
}

export function buildFitProfileUseCases(
  prisma: PrismaService,
  events: EventPublisher,
  logger: LoggerPort,
): FitProfileUseCases {
  return buildFitProfileBundle(prisma, events, logger).useCases;
}

export function buildFitProfileComposition(
  prisma: PrismaService,
  events: EventPublisher,
  logger: LoggerPort,
): BoundedContextComposition<FitProfileUseCases> {
  const { useCases } = buildFitProfileBundle(prisma, events, logger);

  return {
    useCases,
    routes: fitProfileRoutes,
  };
}

/**
 * Registers the fit-profile BC's BullMQ worker + cron schedule against
 * the shared `JobQueuePort`. Called once at app boot from the Elysia
 * bootstrap. Schedule: daily 03:00 America/Sao_Paulo — staggered from
 * the other nightly jobs.
 */
export function registerFitProfileJobs(
  queue: JobQueuePort,
  prisma: PrismaService,
  expireFitProfile: ExpireFitProfileUseCase,
  logger: LoggerPort,
): void {
  const worker = new FitProfileExpireWorker(prisma, expireFitProfile, queue, logger);
  queue.register<FitProfileExpireJobData>(FIT_PROFILE_EXPIRE_QUEUE, worker.process.bind(worker));
  void queue.schedule<FitProfileExpireJobData>(
    FIT_PROFILE_EXPIRE_QUEUE,
    { kind: 'schedule' },
    {
      repeat: { pattern: '0 3 * * *', tz: 'America/Sao_Paulo' },
      jobId: 'fit-profile-expire-schedule-cron',
    },
  );
}
