import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { FeatureFlagsModule } from '@/bounded-contexts/platform/feature-flags/feature-flags.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { ResumeQualityUseCases } from './application/ports/resume-quality.port';
import { ComputeQualityUseCase } from './application/use-cases/compute-quality.use-case';
import { GetLatestQualityUseCase } from './application/use-cases/get-latest-quality.use-case';
import { ContentQualityPort } from './domain/ports/content-quality.port';
import { QualityScoreRepositoryPort } from './domain/ports/quality-score.repository.port';
import { ResumeLoaderPort } from './domain/ports/resume-loader.port';
import { AiContentQualityAdapter } from './infrastructure/adapters/ai-content-quality.adapter';
import { PrismaQualityScoreRepository } from './infrastructure/adapters/persistence/prisma-quality-score.repository';
import { PrismaResumeLoader } from './infrastructure/adapters/persistence/prisma-resume-loader.adapter';
import { RequireMinQualityGuard } from './infrastructure/guards/require-min-quality.guard';
import {
  RESUME_QUALITY_QUEUE,
  ResumeQualityWorker,
} from './infrastructure/workers/resume-quality.worker';
import { buildResumeQualityUseCases } from './resume-quality.composition';
import { resumeQualityRoutes } from './resume-quality.routes';

/**
 * resume-quality/ bounded context — owns the Resume Quality Score
 * (Completeness + Content Quality). Content Quality runs behind the
 * `scoring.content-quality.enabled` kill-switch: flag OFF → AI adapter
 * returns null → use-case falls back to Completeness alone.
 */
@Module({
  imports: [
    PrismaModule,
    AiModule,
    FeatureFlagsModule,
    EventBusModule,
    BullModule.registerQueue({ name: RESUME_QUALITY_QUEUE }),
  ],
  controllers: synthesizeRouteControllers(ResumeQualityUseCases, resumeQualityRoutes),
  providers: [
    {
      provide: ResumeQualityUseCases,
      useFactory: (
        resumeLoader: ResumeLoaderPort,
        contentQuality: ContentQualityPort,
        repository: QualityScoreRepositoryPort,
        events: EventPublisher,
        logger: LoggerPort,
      ) =>
        buildResumeQualityUseCases(resumeLoader, contentQuality, repository, events, logger),
      inject: [
        ResumeLoaderPort,
        ContentQualityPort,
        QualityScoreRepositoryPort,
        EventPublisher,
        LoggerPort,
      ],
    },
    // Backwards-compatible providers — sub-uses still inject the
    // individual use cases (e.g. `ResumeQualityWorker`).
    {
      provide: ComputeQualityUseCase,
      useFactory: (bc: ResumeQualityUseCases) => bc.computeQuality,
      inject: [ResumeQualityUseCases],
    },
    {
      provide: GetLatestQualityUseCase,
      useFactory: (bc: ResumeQualityUseCases) => bc.getLatestQuality,
      inject: [ResumeQualityUseCases],
    },
    PrismaResumeLoader,
    AiContentQualityAdapter,
    PrismaQualityScoreRepository,
    ResumeQualityWorker,
    RequireMinQualityGuard,
    { provide: ResumeLoaderPort, useExisting: PrismaResumeLoader },
    { provide: ContentQualityPort, useExisting: AiContentQualityAdapter },
    { provide: QualityScoreRepositoryPort, useExisting: PrismaQualityScoreRepository },
  ],
  exports: [ComputeQualityUseCase, GetLatestQualityUseCase, RequireMinQualityGuard],
})
export class ResumeQualityModule {}
