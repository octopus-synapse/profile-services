/**
 * Automation Module
 *
 * Thin Nest shell over `buildAutomationUseCases`. The two BullMQ workers
 * stay Nest-decorated (`@Processor`, `@InjectQueue`) and consume the
 * shared `CuratedSelectorService` plus `ResumeTailorService` directly —
 * those are also handed into the composition so use cases and workers
 * share the same instances.
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
import { AutomationUseCases } from './application/ports/automation.port';
import { CuratedSelectorService } from './application/services/curated-selector.service';
import { buildAutomationUseCases } from './automation.composition';
import { ResumeJobMatcherPort } from './domain/ports/resume-job-matcher.port';
import { ResumeAnalyticsJobMatcherAdapter } from './infrastructure/adapters/external-services/resume-analytics-job-matcher.adapter';
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
      provide: ResumeJobMatcherPort,
      useFactory: (facade: ResumeAnalyticsFacade) => new ResumeAnalyticsJobMatcherAdapter(facade),
      inject: [ResumeAnalyticsFacade],
    },
    {
      provide: CuratedSelectorService,
      useFactory: (prisma: PrismaService, matcher: ResumeJobMatcherPort, logger: LoggerPort) =>
        new CuratedSelectorService(prisma, matcher, logger),
      inject: [PrismaService, ResumeJobMatcherPort, LoggerPort],
    },
    {
      provide: AutomationUseCases,
      useFactory: (
        prisma: PrismaService,
        logger: LoggerPort,
        selector: CuratedSelectorService,
        tailor: ResumeTailorService,
      ) => buildAutomationUseCases(prisma, logger, selector, tailor),
      inject: [PrismaService, LoggerPort, CuratedSelectorService, ResumeTailorService],
    },
    WeeklyCuratedWorker,
    AutoApplyWorker,
  ],
  exports: [AutomationUseCases, CuratedSelectorService],
})
export class AutomationModule {}
