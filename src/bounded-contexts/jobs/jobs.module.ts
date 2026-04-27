/**
 * Jobs Module
 *
 * Thin Nest shell over `buildJobsUseCases`. All wiring lives in
 * `jobs.composition.ts`. The HTTP boundary lives in `jobs.routes.ts`;
 * the synthesizer turns those `Route` descriptors into Nest controllers
 * at boot, with the rate-limit guard wired via the registry. The
 * anti-ghosting cron worker stays Nest-decorated and consumes the
 * bundle.
 */

import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { RateLimitGuard } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.guard';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { CronPort } from '@/shared-kernel/jobs/cron.port';
import { JobsUseCases } from './application/ports/jobs.port';
import { buildJobsUseCases, registerJobsJobs } from './jobs.composition';
import { jobsRoutes, RATE_LIMIT_KEY } from './jobs.routes';

@Module({
  imports: [PrismaModule, ResumeAnalyticsModule, EmailModule, AiModule, RateLimitModule],
  controllers: synthesizeRouteControllers(JobsUseCases, jobsRoutes, {
    guards: {
      'rate-limit': { guard: RateLimitGuard, metadataKey: RATE_LIMIT_KEY },
    },
  }),
  providers: [
    {
      provide: JobsUseCases,
      useFactory: (
        prisma: PrismaService,
        email: EmailService,
        logger: LoggerPort,
        events: EventPublisherPort,
        llm: LlmPort,
        resumeAnalytics: ResumeAnalyticsFacade,
      ) => buildJobsUseCases(prisma, email, logger, events, llm, resumeAnalytics),
      inject: [
        PrismaService,
        EmailService,
        LoggerPort,
        EventPublisherPort,
        LlmPort,
        ResumeAnalyticsFacade,
      ],
    },
    // Side-effect provider: registers the anti-ghosting cron sweep
    // against the global CronPort at module-init time.
    {
      provide: 'JOBS_JOBS_REGISTERED',
      useFactory: (cron: CronPort, bundle: JobsUseCases, logger: LoggerPort) => {
        registerJobsJobs(cron, bundle, logger);
        return true;
      },
      inject: [CronPort, JobsUseCases, LoggerPort],
    },
  ],
  exports: [JobsUseCases],
})
export class JobsModule {}
