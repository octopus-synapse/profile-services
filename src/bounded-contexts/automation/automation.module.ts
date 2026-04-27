/**
 * Automation Module
 *
 * ADR-001: two slices share this module — apply-mode (weekly curated
 * approval flow) and rage-apply (one-shot bulk apply). Each has its own
 * repository port + Prisma adapter; the apply-mode slice exposes 3 use
 * cases, rage-apply 1. `CuratedSelectorService` is a POJO orchestrator
 * shared with the workers (auto-apply + weekly-curated). Workers stay as
 * Nest-decorated BullMQ processors and continue to live under `workers/`.
 */

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import { FitProfileModule } from '@/bounded-contexts/fit-profile/fit-profile.module';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeQualityModule } from '@/bounded-contexts/resume-quality/resume-quality.module';
import { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import { ResumeVersionsModule } from '@/bounded-contexts/resumes/resume-versions/resume-versions.module';
import { LoggerPort } from '@/shared-kernel';
import { CuratedSelectorService } from './application/services/curated-selector.service';
import { ApproveCuratedItemUseCase } from './application/use-cases/approve-curated-item/approve-curated-item.use-case';
import { GetCurrentBatchUseCase } from './application/use-cases/get-current-batch/get-current-batch.use-case';
import { RejectCuratedItemUseCase } from './application/use-cases/reject-curated-item/reject-curated-item.use-case';
import { RunRageApplyUseCase } from './application/use-cases/run-rage-apply/run-rage-apply.use-case';
import { ApplyModeRepositoryPort } from './domain/ports/apply-mode.repository.port';
import { RageApplyRepositoryPort } from './domain/ports/rage-apply.repository.port';
import { PrismaApplyModeRepository } from './infrastructure/adapters/persistence/prisma-apply-mode.repository';
import { PrismaRageApplyRepository } from './infrastructure/adapters/persistence/prisma-rage-apply.repository';
import { ApplyModeController } from './infrastructure/controllers/apply-mode.controller';
import { RageApplyController } from './infrastructure/controllers/rage-apply.controller';
import { AUTO_APPLY_QUEUE, AutoApplyWorker } from './workers/auto-apply.worker';
import { WEEKLY_CURATED_QUEUE, WeeklyCuratedWorker } from './workers/weekly-curated.worker';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ResumeAnalyticsModule,
    ResumeVersionsModule,
    FitProfileModule,
    ResumeQualityModule,
    BullModule.registerQueue({ name: WEEKLY_CURATED_QUEUE }, { name: AUTO_APPLY_QUEUE }),
  ],
  controllers: [ApplyModeController, RageApplyController],
  providers: [
    {
      provide: ApplyModeRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaApplyModeRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: RageApplyRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaRageApplyRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: CuratedSelectorService,
      useFactory: (prisma: PrismaService, analytics: ResumeAnalyticsFacade, logger: LoggerPort) =>
        new CuratedSelectorService(prisma, analytics, logger),
      inject: [PrismaService, ResumeAnalyticsFacade, LoggerPort],
    },
    {
      provide: GetCurrentBatchUseCase,
      useFactory: (repo: ApplyModeRepositoryPort) => new GetCurrentBatchUseCase(repo),
      inject: [ApplyModeRepositoryPort],
    },
    {
      provide: ApproveCuratedItemUseCase,
      useFactory: (repo: ApplyModeRepositoryPort, logger: LoggerPort) =>
        new ApproveCuratedItemUseCase(repo, logger),
      inject: [ApplyModeRepositoryPort, LoggerPort],
    },
    {
      provide: RejectCuratedItemUseCase,
      useFactory: (repo: ApplyModeRepositoryPort, logger: LoggerPort) =>
        new RejectCuratedItemUseCase(repo, logger),
      inject: [ApplyModeRepositoryPort, LoggerPort],
    },
    {
      provide: RunRageApplyUseCase,
      useFactory: (
        repo: RageApplyRepositoryPort,
        selector: CuratedSelectorService,
        tailor: ResumeTailorService,
        logger: LoggerPort,
      ) => new RunRageApplyUseCase(repo, selector, tailor, logger),
      inject: [RageApplyRepositoryPort, CuratedSelectorService, ResumeTailorService, LoggerPort],
    },
    WeeklyCuratedWorker,
    AutoApplyWorker,
  ],
  exports: [CuratedSelectorService, RunRageApplyUseCase],
})
export class AutomationModule {}
