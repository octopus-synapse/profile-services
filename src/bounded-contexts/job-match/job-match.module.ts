import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { SimilarityPort } from '@/bounded-contexts/fit-profile/domain/ports/similarity.port';
import { FitProfileModule } from '@/bounded-contexts/fit-profile/fit-profile.module';
import { NotificationsModule } from '@/bounded-contexts/notifications/notifications.module';
import { NotificationsUseCases } from '@/bounded-contexts/notifications/application/ports/notifications.port';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { FeatureFlagsModule } from '@/bounded-contexts/platform/feature-flags/feature-flags.module';
import { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusPort, EventPublisher, LoggerPort } from '@/shared-kernel';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { ComputeMatchUseCase } from './application/use-cases/compute-match.use-case';
import { JobLoaderPort } from './domain/ports/job-loader.port';
import { MatchCachePort } from './domain/ports/match-cache.port';
import { RequirementsMatcherPort } from './domain/ports/requirements-matcher.port';
import { ResumeExistencePort } from './domain/ports/resume-existence.port';
import { ResumeKeywordSourcePort } from './domain/ports/resume-keyword-source.port';
import { SemanticMatcherPort } from './domain/ports/semantic-matcher.port';
import { UserFitStatePort } from './domain/ports/user-fit-state.port';
import { AiRequirementsMatcherAdapter } from './infrastructure/adapters/ai-requirements-matcher.adapter';
import { AiSemanticMatcherAdapter } from './infrastructure/adapters/ai-semantic-matcher.adapter';
import { PrismaResumeKeywordSource } from './infrastructure/adapters/keyword-matcher.adapter';
import { PrismaJobLoader } from './infrastructure/adapters/persistence/prisma-job-loader.repository';
import { PrismaResumeExistence } from './infrastructure/adapters/persistence/prisma-resume-existence.repository';
import { PrismaUserFitStateAdapter } from './infrastructure/adapters/persistence/prisma-user-fit-state.repository';
import { RedisMatchCacheAdapter } from './infrastructure/adapters/redis-match-cache.adapter';
import { registerJobMatchHandlers } from './infrastructure/handlers/register-handlers';
import {
  DAILY_RECOMMENDATIONS_QUEUE,
  DailyRecommendationsWorker,
  type DailyRecommendationsJobData,
} from './infrastructure/workers/daily-recommendations.worker';
import {
  JOB_MATCH_RECOMPUTE_QUEUE,
  JobMatchRecomputeWorker,
  type JobMatchRecomputeJobData,
} from './infrastructure/workers/job-match-recompute.worker';
import { jobMatchRoutes } from './job-match.routes';

/**
 * job-match/ bounded context — owner of the Match Score. Consumes
 * `SimilarityPort` from the `fit-profile` context for the Fit sub-score;
 * the AI sub-scores (Requirements, Semantic) ride on top of the shared
 * `ai/` context. Semantic is kill-switched via
 * `scoring.match.semantic.enabled`; Requirements degrades to a null
 * score on AI failure so the blender drops the sub-score.
 *
 * Workers are framework-free POJOs registered against the global
 * `JobQueuePort` via a side-effect provider. The `@OnEvent` listener
 * that drives the recompute queue lives in a sibling handler file
 * owned by the EventBus migration agent.
 */
@Module({
  imports: [
    PrismaModule,
    AiModule,
    FitProfileModule,
    CacheModule,
    FeatureFlagsModule,
    EventBusModule,
    NotificationsModule,
  ],
  controllers: [...synthesizeRouteControllers(ComputeMatchUseCase, jobMatchRoutes)],
  providers: [
    {
      provide: ComputeMatchUseCase,
      useFactory: (
        resumeExistence: ResumeExistencePort,
        jobLoader: JobLoaderPort,
        fitState: UserFitStatePort,
        keywordSource: ResumeKeywordSourcePort,
        requirementsMatcher: RequirementsMatcherPort,
        semanticMatcher: SemanticMatcherPort,
        similarity: SimilarityPort,
        cache: MatchCachePort,
        events: EventPublisher,
        logger: LoggerPort,
      ) =>
        new ComputeMatchUseCase(
          resumeExistence,
          jobLoader,
          fitState,
          keywordSource,
          requirementsMatcher,
          semanticMatcher,
          similarity,
          cache,
          events,
          logger,
        ),
      inject: [
        ResumeExistencePort,
        JobLoaderPort,
        UserFitStatePort,
        ResumeKeywordSourcePort,
        RequirementsMatcherPort,
        SemanticMatcherPort,
        SimilarityPort,
        MatchCachePort,
        EventPublisher,
        LoggerPort,
      ],
    },
    PrismaResumeExistence,
    PrismaJobLoader,
    PrismaUserFitStateAdapter,
    PrismaResumeKeywordSource,
    AiRequirementsMatcherAdapter,
    AiSemanticMatcherAdapter,
    RedisMatchCacheAdapter,
    // Side-effect provider: register `@OnEvent` replacement against EventBusPort.
    {
      provide: 'JOB_MATCH_HANDLERS_REGISTERED',
      useFactory: (eventBus: EventBusPort, queue: JobQueuePort): boolean => {
        registerJobMatchHandlers({ eventBus, queue });
        return true;
      },
      inject: [EventBusPort, JobQueuePort],
    },
    { provide: ResumeExistencePort, useExisting: PrismaResumeExistence },
    { provide: JobLoaderPort, useExisting: PrismaJobLoader },
    { provide: UserFitStatePort, useExisting: PrismaUserFitStateAdapter },
    { provide: ResumeKeywordSourcePort, useExisting: PrismaResumeKeywordSource },
    { provide: RequirementsMatcherPort, useExisting: AiRequirementsMatcherAdapter },
    { provide: SemanticMatcherPort, useExisting: AiSemanticMatcherAdapter },
    { provide: MatchCachePort, useExisting: RedisMatchCacheAdapter },
    // Side-effect provider: registers both BullMQ workers + the
    // daily-recommendations cron tick at module-init time.
    {
      provide: 'JOB_MATCH_JOBS_REGISTERED',
      useFactory: (
        queue: JobQueuePort,
        prisma: PrismaService,
        flags: FeatureFlagService,
        computeMatch: ComputeMatchUseCase,
        notifications: NotificationsUseCases,
        cache: CacheService,
        logger: LoggerPort,
      ) => {
        const recompute = new JobMatchRecomputeWorker(cache, logger);
        queue.register<JobMatchRecomputeJobData>(
          JOB_MATCH_RECOMPUTE_QUEUE,
          recompute.process.bind(recompute),
        );

        const daily = new DailyRecommendationsWorker(
          prisma,
          flags,
          computeMatch,
          notifications,
          queue,
          logger,
        );
        queue.register<DailyRecommendationsJobData>(
          DAILY_RECOMMENDATIONS_QUEUE,
          daily.process.bind(daily),
        );
        // Every 3 days at 04:00 America/Sao_Paulo. Offset from the
        // fit-profile-expire cron (03:00) so the two workers don't
        // compete for the same DB window.
        void queue.schedule<DailyRecommendationsJobData>(
          DAILY_RECOMMENDATIONS_QUEUE,
          { kind: 'schedule' },
          {
            repeat: { pattern: '0 4 */3 * *', tz: 'America/Sao_Paulo' },
            jobId: 'daily-recommendations-schedule-cron',
          },
        );
        return true;
      },
      inject: [
        JobQueuePort,
        PrismaService,
        FeatureFlagService,
        ComputeMatchUseCase,
        NotificationsUseCases,
        CacheService,
        LoggerPort,
      ],
    },
  ],
  exports: [ComputeMatchUseCase],
})
export class JobMatchModule {}
