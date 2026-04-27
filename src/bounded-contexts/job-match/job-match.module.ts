import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { SimilarityPort } from '@/bounded-contexts/fit-profile/domain/ports/similarity.port';
import { FitProfileModule } from '@/bounded-contexts/fit-profile/fit-profile.module';
import { NotificationsModule } from '@/bounded-contexts/notifications/notifications.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { FeatureFlagsModule } from '@/bounded-contexts/platform/feature-flags/feature-flags.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
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
import {
  DAILY_RECOMMENDATIONS_QUEUE,
  DailyRecommendationsWorker,
} from './infrastructure/workers/daily-recommendations.worker';
import {
  JOB_MATCH_RECOMPUTE_QUEUE,
  JobMatchRecomputeWorker,
} from './infrastructure/workers/job-match-recompute.worker';
import { jobMatchRoutes } from './job-match.routes';

/**
 * job-match/ bounded context — owner of the Match Score. Consumes
 * `SimilarityPort` from the `fit-profile` context for the Fit sub-score;
 * the AI sub-scores (Requirements, Semantic) ride on top of the shared
 * `ai/` context. Semantic is kill-switched via
 * `scoring.match.semantic.enabled`; Requirements degrades to a null
 * score on AI failure so the blender drops the sub-score.
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
    BullModule.registerQueue({ name: JOB_MATCH_RECOMPUTE_QUEUE }),
    BullModule.registerQueue({ name: DAILY_RECOMMENDATIONS_QUEUE }),
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
    JobMatchRecomputeWorker,
    DailyRecommendationsWorker,
    { provide: ResumeExistencePort, useExisting: PrismaResumeExistence },
    { provide: JobLoaderPort, useExisting: PrismaJobLoader },
    { provide: UserFitStatePort, useExisting: PrismaUserFitStateAdapter },
    { provide: ResumeKeywordSourcePort, useExisting: PrismaResumeKeywordSource },
    { provide: RequirementsMatcherPort, useExisting: AiRequirementsMatcherAdapter },
    { provide: SemanticMatcherPort, useExisting: AiSemanticMatcherAdapter },
    { provide: MatchCachePort, useExisting: RedisMatchCacheAdapter },
  ],
  exports: [ComputeMatchUseCase],
})
export class JobMatchModule {}
