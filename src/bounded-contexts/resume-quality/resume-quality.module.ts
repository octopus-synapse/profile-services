import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { FeatureFlagsModule } from '@/bounded-contexts/platform/feature-flags/feature-flags.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusPort, EventPublisher, LoggerPort } from '@/shared-kernel';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
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
import { registerResumeQualityHandlers } from './infrastructure/handlers/register-handlers';
import {
  RESUME_QUALITY_QUEUE,
  ResumeQualityWorker,
  type ResumeQualityJobData,
} from './infrastructure/workers/resume-quality.worker';
import { buildResumeQualityUseCases } from './resume-quality.composition';
import { resumeQualityRoutes } from './resume-quality.routes';

/**
 * resume-quality/ bounded context — owns the Resume Quality Score
 * (Completeness + Content Quality). Content Quality runs behind the
 * `scoring.content-quality.enabled` kill-switch: flag OFF → AI adapter
 * returns null → use-case falls back to Completeness alone.
 *
 * The recompute worker is a framework-free POJO registered against the
 * global `JobQueuePort` via a side-effect provider. The `@OnEvent`
 * listener that pushes events into the queue lives in a sibling
 * handler file owned by the EventBus migration agent.
 */
@Module({
  imports: [PrismaModule, AiModule, FeatureFlagsModule, EventBusModule],
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
      ) => buildResumeQualityUseCases(resumeLoader, contentQuality, repository, events, logger),
      inject: [
        ResumeLoaderPort,
        ContentQualityPort,
        QualityScoreRepositoryPort,
        EventPublisher,
        LoggerPort,
      ],
    },
    // Backwards-compatible providers — sub-uses still inject the
    // individual use cases (e.g. the recompute worker).
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
    RequireMinQualityGuard,
    // Side-effect provider: register `@OnEvent` replacement against EventBusPort.
    {
      provide: 'RESUME_QUALITY_HANDLERS_REGISTERED',
      useFactory: (eventBus: EventBusPort, queue: JobQueuePort): boolean => {
        registerResumeQualityHandlers({ eventBus, queue });
        return true;
      },
      inject: [EventBusPort, JobQueuePort],
    },
    { provide: ResumeLoaderPort, useExisting: PrismaResumeLoader },
    { provide: ContentQualityPort, useExisting: AiContentQualityAdapter },
    { provide: QualityScoreRepositoryPort, useExisting: PrismaQualityScoreRepository },
    // Side-effect provider: registers the recompute worker against
    // the global JobQueuePort at module-init time.
    {
      provide: 'RESUME_QUALITY_JOBS_REGISTERED',
      useFactory: (
        queue: JobQueuePort,
        compute: ComputeQualityUseCase,
        logger: LoggerPort,
      ) => {
        const worker = new ResumeQualityWorker(compute, logger);
        queue.register<ResumeQualityJobData>(RESUME_QUALITY_QUEUE, worker.process.bind(worker));
        return true;
      },
      inject: [JobQueuePort, ComputeQualityUseCase, LoggerPort],
    },
  ],
  exports: [ComputeQualityUseCase, GetLatestQualityUseCase, RequireMinQualityGuard],
})
export class ResumeQualityModule {}
