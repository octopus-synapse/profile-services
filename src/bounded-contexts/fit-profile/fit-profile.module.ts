import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { FitProfileUseCases } from './application/ports/fit-profile.port';
import { CreateFitQuestionUseCase } from './application/use-cases/create-fit-question.use-case';
import { DeleteFitProfileUseCase } from './application/use-cases/delete-fit-profile.use-case';
import { DeleteFitQuestionUseCase } from './application/use-cases/delete-fit-question.use-case';
import { ExpireFitProfileUseCase } from './application/use-cases/expire-fit-profile.use-case';
import { GetFitProfileStatusUseCase } from './application/use-cases/get-fit-profile-status.use-case';
import { GetFitQuestionUseCase } from './application/use-cases/get-fit-question.use-case';
import { GetJobFitProfileUseCase } from './application/use-cases/get-job-fit-profile.use-case';
import { GetOrCreateQuestionSetUseCase } from './application/use-cases/get-or-create-question-set.use-case';
import { ListFitQuestionsUseCase } from './application/use-cases/list-fit-questions.use-case';
import { SubmitFitAnswersUseCase } from './application/use-cases/submit-fit-answers.use-case';
import { UpdateFitQuestionUseCase } from './application/use-cases/update-fit-question.use-case';
import { UpsertJobFitProfileUseCase } from './application/use-cases/upsert-job-fit-profile.use-case';
import { FitAnswerRepositoryPort } from './domain/ports/fit-answer.repository.port';
import { FitQuestionRepositoryPort } from './domain/ports/fit-question.repository.port';
import { FitQuestionSetRepositoryPort } from './domain/ports/fit-question-set.repository.port';
import { FitRemapHistoryRepositoryPort } from './domain/ports/fit-remap-history.repository.port';
import { JobFitProfileRepositoryPort } from './domain/ports/job-fit-profile.repository.port';
import { SimilarityPort } from './domain/ports/similarity.port';
import { UserFitProfileRepositoryPort } from './domain/ports/user-fit-profile.repository.port';
import { fitProfileRoutes } from './fit-profile.routes';
import { PrismaFitAnswerRepository } from './infrastructure/adapters/persistence/prisma-fit-answer.repository';
import { PrismaFitQuestionRepository } from './infrastructure/adapters/persistence/prisma-fit-question.repository';
import { PrismaFitQuestionSetRepository } from './infrastructure/adapters/persistence/prisma-fit-question-set.repository';
import { PrismaFitRemapHistoryRepository } from './infrastructure/adapters/persistence/prisma-fit-remap-history.repository';
import { PrismaJobFitProfileRepository } from './infrastructure/adapters/persistence/prisma-job-fit-profile.repository';
import { PrismaUserFitProfileRepository } from './infrastructure/adapters/persistence/prisma-user-fit-profile.repository';
import { WeightedCosineSimilarityAdapter } from './infrastructure/adapters/weighted-cosine-similarity.adapter';
import { RequireFitProfileGuard } from './infrastructure/guards/require-fit-profile.guard';
import {
  FIT_PROFILE_EXPIRE_QUEUE,
  FitProfileExpireWorker,
  type FitProfileExpireJobData,
} from './infrastructure/workers/fit-profile-expire.worker';

/**
 * fit-profile/ bounded context — owns everything behind the Fit Score
 * sub-component of the Match Score. The public surface that other
 * contexts consume is `SimilarityPort` (for job-match/) and
 * `ExpireFitProfileUseCase` (for the BullMQ worker in Task #20).
 *
 * The nightly expire sweeper (`FitProfileExpireWorker`) is a
 * framework-free POJO registered against the global `JobQueuePort` via
 * a side-effect provider.
 */
@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(FitProfileUseCases, fitProfileRoutes),
  providers: [
    // Use cases — POJOs wired via factory so framework swap stays trivial
    {
      provide: SubmitFitAnswersUseCase,
      useFactory: (
        questionSets: FitQuestionSetRepositoryPort,
        questions: FitQuestionRepositoryPort,
        answers: FitAnswerRepositoryPort,
        profiles: UserFitProfileRepositoryPort,
        history: FitRemapHistoryRepositoryPort,
        events: EventPublisher,
        logger: LoggerPort,
      ) =>
        new SubmitFitAnswersUseCase(
          questionSets,
          questions,
          answers,
          profiles,
          history,
          events,
          logger,
        ),
      inject: [
        FitQuestionSetRepositoryPort,
        FitQuestionRepositoryPort,
        FitAnswerRepositoryPort,
        UserFitProfileRepositoryPort,
        FitRemapHistoryRepositoryPort,
        EventPublisher,
        LoggerPort,
      ],
    },
    {
      provide: ExpireFitProfileUseCase,
      useFactory: (
        profiles: UserFitProfileRepositoryPort,
        events: EventPublisher,
        logger: LoggerPort,
      ) => new ExpireFitProfileUseCase(profiles, events, logger),
      inject: [UserFitProfileRepositoryPort, EventPublisher, LoggerPort],
    },
    GetFitProfileStatusUseCase,
    GetOrCreateQuestionSetUseCase,
    DeleteFitProfileUseCase,
    UpsertJobFitProfileUseCase,
    GetJobFitProfileUseCase,
    ListFitQuestionsUseCase,
    CreateFitQuestionUseCase,
    UpdateFitQuestionUseCase,
    DeleteFitQuestionUseCase,
    GetFitQuestionUseCase,

    // Persistence adapters
    PrismaFitQuestionRepository,
    PrismaFitQuestionSetRepository,
    PrismaFitAnswerRepository,
    PrismaUserFitProfileRepository,
    PrismaJobFitProfileRepository,
    PrismaFitRemapHistoryRepository,

    // Default similarity adapter (weighted cosine)
    WeightedCosineSimilarityAdapter,

    // Port → adapter wiring
    { provide: FitQuestionRepositoryPort, useExisting: PrismaFitQuestionRepository },
    { provide: FitQuestionSetRepositoryPort, useExisting: PrismaFitQuestionSetRepository },
    { provide: FitAnswerRepositoryPort, useExisting: PrismaFitAnswerRepository },
    { provide: UserFitProfileRepositoryPort, useExisting: PrismaUserFitProfileRepository },
    { provide: JobFitProfileRepositoryPort, useExisting: PrismaJobFitProfileRepository },
    { provide: FitRemapHistoryRepositoryPort, useExisting: PrismaFitRemapHistoryRepository },
    { provide: SimilarityPort, useExisting: WeightedCosineSimilarityAdapter },

    // Guard exposed to other modules so they can `@UseGuards()` it
    RequireFitProfileGuard,

    // Side-effect provider: registers the nightly expire worker +
    // its schedule tick against the global JobQueuePort.
    {
      provide: 'FIT_PROFILE_JOBS_REGISTERED',
      useFactory: (
        queue: JobQueuePort,
        prisma: PrismaService,
        expireUseCase: ExpireFitProfileUseCase,
        logger: LoggerPort,
      ) => {
        const worker = new FitProfileExpireWorker(prisma, expireUseCase, queue, logger);
        queue.register<FitProfileExpireJobData>(
          FIT_PROFILE_EXPIRE_QUEUE,
          worker.process.bind(worker),
        );
        // Daily 03:00 America/Sao_Paulo — staggered from the other
        // nightly jobs.
        void queue.schedule<FitProfileExpireJobData>(
          FIT_PROFILE_EXPIRE_QUEUE,
          { kind: 'schedule' },
          {
            repeat: { pattern: '0 3 * * *', tz: 'America/Sao_Paulo' },
            jobId: 'fit-profile-expire-schedule-cron',
          },
        );
        return true;
      },
      inject: [JobQueuePort, PrismaService, ExpireFitProfileUseCase, LoggerPort],
    },

    {
      provide: FitProfileUseCases,
      useFactory: (
        getFitProfileStatus: GetFitProfileStatusUseCase,
        getOrCreateQuestionSet: GetOrCreateQuestionSetUseCase,
        submitFitAnswers: SubmitFitAnswersUseCase,
        deleteFitProfile: DeleteFitProfileUseCase,
        upsertJobFitProfile: UpsertJobFitProfileUseCase,
        getJobFitProfile: GetJobFitProfileUseCase,
        listFitQuestions: ListFitQuestionsUseCase,
        createFitQuestion: CreateFitQuestionUseCase,
        updateFitQuestion: UpdateFitQuestionUseCase,
        deleteFitQuestion: DeleteFitQuestionUseCase,
        getFitQuestion: GetFitQuestionUseCase,
      ): FitProfileUseCases => ({
        getFitProfileStatus,
        getOrCreateQuestionSet,
        submitFitAnswers,
        deleteFitProfile,
        upsertJobFitProfile,
        getJobFitProfile,
        listFitQuestions,
        createFitQuestion,
        updateFitQuestion,
        deleteFitQuestion,
        getFitQuestion,
      }),
      inject: [
        GetFitProfileStatusUseCase,
        GetOrCreateQuestionSetUseCase,
        SubmitFitAnswersUseCase,
        DeleteFitProfileUseCase,
        UpsertJobFitProfileUseCase,
        GetJobFitProfileUseCase,
        ListFitQuestionsUseCase,
        CreateFitQuestionUseCase,
        UpdateFitQuestionUseCase,
        DeleteFitQuestionUseCase,
        GetFitQuestionUseCase,
      ],
    },
  ],
  exports: [
    // Consumed by job-match/ (Task #18)
    SimilarityPort,
    // Consumed by the BullMQ expire worker (Task #20)
    ExpireFitProfileUseCase,
    // Convenience re-exports for adjacent contexts that need read access
    UserFitProfileRepositoryPort,
    JobFitProfileRepositoryPort,
    // Lockout guard for adjacent contexts (Task #27 — automation, tailor)
    RequireFitProfileGuard,
  ],
})
export class FitProfileModule {}
