/**
 * Jobs Module
 *
 * Thin Nest shell over `buildJobsUseCases`. All wiring lives in
 * `jobs.composition.ts`. The anti-ghosting cron worker stays Nest-
 * decorated and consumes the bundle.
 */

import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { JobsUseCases } from './application/ports/jobs.port';
import { ApplicationTrackerController } from './infrastructure/controllers/application-tracker.controller';
import { JobController } from './infrastructure/controllers/job.controller';
import { AntiGhostingWorker } from './infrastructure/workers/anti-ghosting.worker';
import { buildJobsUseCases } from './jobs.composition';

@Module({
  imports: [PrismaModule, ResumeAnalyticsModule, EmailModule, AiModule, RateLimitModule],
  controllers: [JobController, ApplicationTrackerController],
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
    AntiGhostingWorker,
  ],
  exports: [JobsUseCases],
})
export class JobsModule {}
