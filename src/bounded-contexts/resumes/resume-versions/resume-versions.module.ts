/**
 * Resume Versions Module — ADR-001 hex layout.
 *
 * The two surfaces this BC owns:
 *   - Resume versioning (snapshot/list/restore) implemented by 3 use
 *     cases. The `ResumeVersionService` facade adapts them to the
 *     cross-BC `ResumeVersionServicePort` consumed by the resumes core BC.
 *   - Resume tailoring (AI rewrite + diff). 3 use cases sit behind
 *     `ResumeTailorService` so cross-BC consumers (`automation/`) keep
 *     a stable public surface.
 *
 * Outbound ports:
 *   - `ResumeVersionsRepositoryPort` → `PrismaResumeVersionsRepository`
 *   - `ResumeTailorLlmPort` → `LlmResumeTailorAdapter` (delegates to ai BC)
 *   - `ResumeEventPublisher` → shared resumes adapter
 */

import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { FitProfileModule } from '@/bounded-contexts/fit-profile/fit-profile.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeQualityModule } from '@/bounded-contexts/resume-quality/resume-quality.module';
import { ResumeVersionServicePort } from '@/bounded-contexts/resumes/core/ports/resume-version-service.port';
import { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { ResumeEventPublisherAdapter } from '@/bounded-contexts/resumes/infrastructure/adapters';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { ResumeTailorService } from './application/services/resume-tailor.service';
import { ResumeVersionService } from './application/services/resume-version.service';
import { CreateSnapshotUseCase } from './application/use-cases/create-snapshot/create-snapshot.use-case';
import { GetTailoredVersionDiffUseCase } from './application/use-cases/get-tailored-version-diff/get-tailored-version-diff.use-case';
import { GetTailoredVersionsUseCase } from './application/use-cases/get-tailored-versions/get-tailored-versions.use-case';
import { GetVersionsUseCase } from './application/use-cases/get-versions/get-versions.use-case';
import { RestoreVersionUseCase } from './application/use-cases/restore-version/restore-version.use-case';
import { TailorResumeForJobUseCase } from './application/use-cases/tailor-resume-for-job/tailor-resume-for-job.use-case';
import { ResumeTailorLlmPort } from './domain/ports/resume-tailor-llm.port';
import { ResumeVersionsRepositoryPort } from './domain/ports/resume-versions.repository.port';
import { LlmResumeTailorAdapter } from './infrastructure/adapters/external-services/llm-resume-tailor.adapter';
import { PrismaResumeVersionsRepository } from './infrastructure/adapters/persistence/prisma-resume-versions.repository';
import { ResumeTailorController } from './infrastructure/controllers/resume-tailor.controller';
import { ResumeVersionController } from './infrastructure/controllers/resume-version.controller';

@Module({
  imports: [PrismaModule, AiModule, FitProfileModule, ResumeQualityModule],
  controllers: [ResumeVersionController, ResumeTailorController],
  providers: [
    {
      provide: ResumeEventPublisher,
      useFactory: (eventPublisher: EventPublisher) =>
        new ResumeEventPublisherAdapter(eventPublisher),
      inject: [EventPublisher],
    },
    {
      provide: ResumeVersionsRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaResumeVersionsRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: ResumeTailorLlmPort,
      useFactory: (llm: LlmPort) => new LlmResumeTailorAdapter(llm),
      inject: [LlmPort],
    },
    {
      provide: CreateSnapshotUseCase,
      useFactory: (repo: ResumeVersionsRepositoryPort, events: ResumeEventPublisher) =>
        new CreateSnapshotUseCase(repo, events),
      inject: [ResumeVersionsRepositoryPort, ResumeEventPublisher],
    },
    {
      provide: GetVersionsUseCase,
      useFactory: (repo: ResumeVersionsRepositoryPort) => new GetVersionsUseCase(repo),
      inject: [ResumeVersionsRepositoryPort],
    },
    {
      provide: RestoreVersionUseCase,
      useFactory: (
        repo: ResumeVersionsRepositoryPort,
        snapshot: CreateSnapshotUseCase,
        events: ResumeEventPublisher,
      ) => new RestoreVersionUseCase(repo, snapshot, events),
      inject: [ResumeVersionsRepositoryPort, CreateSnapshotUseCase, ResumeEventPublisher],
    },
    {
      provide: TailorResumeForJobUseCase,
      useFactory: (repo: ResumeVersionsRepositoryPort, llm: ResumeTailorLlmPort) =>
        new TailorResumeForJobUseCase(repo, llm),
      inject: [ResumeVersionsRepositoryPort, ResumeTailorLlmPort],
    },
    {
      provide: GetTailoredVersionsUseCase,
      useFactory: (repo: ResumeVersionsRepositoryPort) => new GetTailoredVersionsUseCase(repo),
      inject: [ResumeVersionsRepositoryPort],
    },
    {
      provide: GetTailoredVersionDiffUseCase,
      useFactory: (repo: ResumeVersionsRepositoryPort) => new GetTailoredVersionDiffUseCase(repo),
      inject: [ResumeVersionsRepositoryPort],
    },
    {
      provide: ResumeVersionService,
      useFactory: (
        snapshot: CreateSnapshotUseCase,
        getVersions: GetVersionsUseCase,
        restore: RestoreVersionUseCase,
      ) => new ResumeVersionService(snapshot, getVersions, restore),
      inject: [CreateSnapshotUseCase, GetVersionsUseCase, RestoreVersionUseCase],
    },
    {
      provide: ResumeTailorService,
      useFactory: (
        tailor: TailorResumeForJobUseCase,
        list: GetTailoredVersionsUseCase,
        diff: GetTailoredVersionDiffUseCase,
      ) => new ResumeTailorService(tailor, list, diff),
      inject: [TailorResumeForJobUseCase, GetTailoredVersionsUseCase, GetTailoredVersionDiffUseCase],
    },
    { provide: ResumeVersionServicePort, useExisting: ResumeVersionService },
  ],
  exports: [
    ResumeVersionService,
    ResumeVersionServicePort,
    ResumeTailorService,
    ResumeEventPublisher,
  ],
})
export class ResumeVersionsModule {}
