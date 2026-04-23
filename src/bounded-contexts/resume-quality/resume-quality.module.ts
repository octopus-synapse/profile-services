import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ComputeQualityUseCase } from './application/use-cases/compute-quality.use-case';
import { GetLatestQualityUseCase } from './application/use-cases/get-latest-quality.use-case';
import { ContentQualityPort } from './domain/ports/content-quality.port';
import { QualityScoreRepositoryPort } from './domain/ports/quality-score.repository.port';
import { ResumeLoaderPort } from './domain/ports/resume-loader.port';
import { ContentQualityStubAdapter } from './infrastructure/adapters/content-quality-stub.adapter';
import { PrismaQualityScoreRepository } from './infrastructure/adapters/persistence/prisma-quality-score.repository';
import { PrismaResumeLoader } from './infrastructure/adapters/persistence/prisma-resume-loader.adapter';
import { ResumeQualityController } from './infrastructure/controllers/resume-quality.controller';

/**
 * resume-quality/ bounded context — owns the Resume Quality Score
 * (Completeness + Content Quality). Event-driven recompute via BullMQ
 * wires into this module in Task #20; the controller already covers
 * the on-demand path.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ResumeQualityController],
  providers: [
    ComputeQualityUseCase,
    GetLatestQualityUseCase,
    PrismaResumeLoader,
    ContentQualityStubAdapter,
    PrismaQualityScoreRepository,
    { provide: ResumeLoaderPort, useExisting: PrismaResumeLoader },
    { provide: ContentQualityPort, useExisting: ContentQualityStubAdapter },
    { provide: QualityScoreRepositoryPort, useExisting: PrismaQualityScoreRepository },
  ],
  exports: [ComputeQualityUseCase, GetLatestQualityUseCase],
})
export class ResumeQualityModule {}
