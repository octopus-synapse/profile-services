/**
 * Automation Module
 *
 * Thin Nest shell over `buildAutomationUseCases`. The two BullMQ workers
 * (`AutoApplyWorker`, `WeeklyCuratedWorker`) are framework-free POJOs
 * registered through `registerAutomationJobs` against the global
 * `JobQueuePort`.
 *
 * The HTTP boundary lives in `automation.routes.ts`; the synthesizer
 * turns those `Route` descriptors into Nest controllers at boot. Custom
 * business gates (`RequireFitProfileGuard`, `RequireMinQualityGuard`)
 * are wired via the synthesizer's guard registry.
 */

import { Module } from '@nestjs/common';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import { FitProfileModule } from '@/bounded-contexts/fit-profile/fit-profile.module';
import { RequireFitProfileGuard } from '@/bounded-contexts/fit-profile/infrastructure/guards/require-fit-profile.guard';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { RequireMinQualityGuard } from '@/bounded-contexts/resume-quality/infrastructure/guards/require-min-quality.guard';
import { ResumeQualityModule } from '@/bounded-contexts/resume-quality/resume-quality.module';
import { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import { ResumeVersionsModule } from '@/bounded-contexts/resumes/resume-versions/resume-versions.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { AutomationUseCases } from './application/ports/automation.port';
import { CuratedSelectorService } from './application/services/curated-selector.service';
import { buildAutomationUseCases, registerAutomationJobs } from './automation.composition';
import { automationRoutes } from './automation.routes';
import { ResumeJobMatcherPort } from './domain/ports/resume-job-matcher.port';
import { ResumeAnalyticsJobMatcherAdapter } from './infrastructure/adapters/external-services/resume-analytics-job-matcher.adapter';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ResumeAnalyticsModule,
    ResumeVersionsModule,
    FitProfileModule,
    ResumeQualityModule,
  ],
  controllers: synthesizeRouteControllers(AutomationUseCases, automationRoutes, {
    guards: {
      // Both `RequireFitProfileGuard` and `RequireMinQualityGuard` have
      // built-in metadata fallbacks (standard-role check / default min
      // 50) so the registry entries don't need to set any metadata key
      // — the legacy `@RequireMinQuality()` call site used those same
      // defaults.
      'fit-profile': { guard: RequireFitProfileGuard },
      'min-quality': { guard: RequireMinQualityGuard },
    },
  }),
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
    // Side-effect provider: registers the BullMQ workers + their
    // schedule ticks at module-init time.
    {
      provide: 'AUTOMATION_JOBS_REGISTERED',
      useFactory: (
        queue: JobQueuePort,
        prisma: PrismaService,
        selector: CuratedSelectorService,
        tailor: ResumeTailorService,
        email: EmailService,
        logger: LoggerPort,
      ) => {
        registerAutomationJobs(queue, prisma, selector, tailor, email, logger);
        return true;
      },
      inject: [
        JobQueuePort,
        PrismaService,
        CuratedSelectorService,
        ResumeTailorService,
        EmailService,
        LoggerPort,
      ],
    },
  ],
  exports: [AutomationUseCases, CuratedSelectorService],
})
export class AutomationModule {}
