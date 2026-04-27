/**
 * Jobs Module
 *
 * ADR-001: the catalog and tracker slices share this module. The
 * catalog ships 18 use cases over `JobsRepositoryPort` (Prisma) +
 * three application services (`JobEnrichmentService`,
 * `FitScoreBatchService`, `JobImportService`). The tracker ships 5
 * use cases (timeline, events, response stats, ensure-submitted,
 * sweep) over `ApplicationTrackerRepositoryPort` +
 * `AntiGhostingRepositoryPort` + `AntiGhostingEmailerPort`. The
 * `EnsureSubmittedEventUseCase` doubles as the `ApplicationTrackerPort`
 * implementation so the catalog's `ApplyToJob` can wire it without
 * cross-slice imports. `AntiGhostingWorker` stays Nest-decorated.
 */

import { Module } from '@nestjs/common';
import { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { FitScoreBatchService } from './application/services/fit-score-batch.service';
import { JobEnrichmentService } from './application/services/job-enrichment.service';
import { JobImportService } from './application/services/job-import.service';
import { ApplyToJobUseCase } from './application/use-cases/apply-to-job/apply-to-job.use-case';
import { BookmarkJobUseCase } from './application/use-cases/bookmark-job/bookmark-job.use-case';
import { CreateJobUseCase } from './application/use-cases/create-job/create-job.use-case';
import { DeleteJobUseCase } from './application/use-cases/delete-job/delete-job.use-case';
import { EnsureSubmittedEventUseCase } from './application/use-cases/ensure-submitted-event/ensure-submitted-event.use-case';
import { FindSimilarJobsUseCase } from './application/use-cases/find-similar-jobs/find-similar-jobs.use-case';
import { GetCompanyResponseStatsUseCase } from './application/use-cases/get-company-response-stats/get-company-response-stats.use-case';
import { GetJobUseCase } from './application/use-cases/get-job/get-job.use-case';
import { GetJobFitUseCase } from './application/use-cases/get-job-fit/get-job-fit.use-case';
import { ImportJobFromUrlUseCase } from './application/use-cases/import-job-from-url/import-job-from-url.use-case';
import { ListApplicationTimelineUseCase } from './application/use-cases/list-application-timeline/list-application-timeline.use-case';
import { ListBookmarkedJobsUseCase } from './application/use-cases/list-bookmarked-jobs/list-bookmarked-jobs.use-case';
import { ListJobApplicationsUseCase } from './application/use-cases/list-job-applications/list-job-applications.use-case';
import { ListJobsUseCase } from './application/use-cases/list-jobs/list-jobs.use-case';
import { ListJobsWithFitScoreUseCase } from './application/use-cases/list-jobs-with-fit-score/list-jobs-with-fit-score.use-case';
import { ListMyApplicationsUseCase } from './application/use-cases/list-my-applications/list-my-applications.use-case';
import { ListMyJobsUseCase } from './application/use-cases/list-my-jobs/list-my-jobs.use-case';
import { ListRecommendedJobsUseCase } from './application/use-cases/list-recommended-jobs/list-recommended-jobs.use-case';
import { RecordApplicationEventUseCase } from './application/use-cases/record-application-event/record-application-event.use-case';
import { RunAntiGhostingSweepUseCase } from './application/use-cases/run-anti-ghosting-sweep/run-anti-ghosting-sweep.use-case';
import { UnbookmarkJobUseCase } from './application/use-cases/unbookmark-job/unbookmark-job.use-case';
import { UpdateJobUseCase } from './application/use-cases/update-job/update-job.use-case';
import { WithdrawApplicationUseCase } from './application/use-cases/withdraw-application/withdraw-application.use-case';
import { AntiGhostingEmailerPort } from './domain/ports/anti-ghosting-emailer.port';
import { AntiGhostingRepositoryPort } from './domain/ports/anti-ghosting.repository.port';
import { ApplicationTrackerPort } from './domain/ports/application-tracker.port';
import { ApplicationTrackerRepositoryPort } from './domain/ports/application-tracker.repository.port';
import { JobsRepositoryPort } from './domain/ports/jobs.repository.port';
import { ResumeJobMatcherPort } from './domain/ports/resume-job-matcher.port';
import { EmailServiceAntiGhostingEmailerAdapter } from './infrastructure/adapters/external-services/email-service-anti-ghosting-emailer.adapter';
import { ResumeAnalyticsJobMatcherAdapter } from './infrastructure/adapters/external-services/resume-analytics-job-matcher.adapter';
import { PrismaAntiGhostingRepository } from './infrastructure/adapters/persistence/prisma-anti-ghosting.repository';
import { PrismaApplicationTrackerRepository } from './infrastructure/adapters/persistence/prisma-application-tracker.repository';
import { PrismaJobsRepository } from './infrastructure/adapters/persistence/prisma-jobs.repository';
import { ApplicationTrackerController } from './infrastructure/controllers/application-tracker.controller';
import { JobController } from './infrastructure/controllers/job.controller';
import { AntiGhostingWorker } from './infrastructure/workers/anti-ghosting.worker';

@Module({
  imports: [PrismaModule, ResumeAnalyticsModule, EmailModule, AiModule, RateLimitModule],
  controllers: [JobController, ApplicationTrackerController],
  providers: [
    // ----- Repository / external-service ports -----
    {
      provide: JobsRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaJobsRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: ApplicationTrackerRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaApplicationTrackerRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: AntiGhostingRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAntiGhostingRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: AntiGhostingEmailerPort,
      useFactory: (email: EmailService, logger: LoggerPort) =>
        new EmailServiceAntiGhostingEmailerAdapter(email, logger),
      inject: [EmailService, LoggerPort],
    },
    {
      provide: ResumeJobMatcherPort,
      useFactory: (facade: ResumeAnalyticsFacade) => new ResumeAnalyticsJobMatcherAdapter(facade),
      inject: [ResumeAnalyticsFacade],
    },

    // ----- Application services (orchestrators) -----
    {
      provide: JobEnrichmentService,
      useFactory: (repo: JobsRepositoryPort) => new JobEnrichmentService(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: FitScoreBatchService,
      useFactory: (repo: JobsRepositoryPort) => new FitScoreBatchService(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: JobImportService,
      useFactory: (llm: LlmPort) => new JobImportService(llm),
      inject: [LlmPort],
    },

    // ----- Tracker use cases -----
    {
      provide: EnsureSubmittedEventUseCase,
      useFactory: (repo: ApplicationTrackerRepositoryPort) => new EnsureSubmittedEventUseCase(repo),
      inject: [ApplicationTrackerRepositoryPort],
    },
    {
      // EnsureSubmittedEventUseCase extends ApplicationTrackerPort, so it
      // doubles as the catalog-facing port binding.
      provide: ApplicationTrackerPort,
      useExisting: EnsureSubmittedEventUseCase,
    },
    {
      provide: ListApplicationTimelineUseCase,
      useFactory: (repo: ApplicationTrackerRepositoryPort) =>
        new ListApplicationTimelineUseCase(repo),
      inject: [ApplicationTrackerRepositoryPort],
    },
    {
      provide: RecordApplicationEventUseCase,
      useFactory: (repo: ApplicationTrackerRepositoryPort) =>
        new RecordApplicationEventUseCase(repo),
      inject: [ApplicationTrackerRepositoryPort],
    },
    {
      provide: GetCompanyResponseStatsUseCase,
      useFactory: (repo: ApplicationTrackerRepositoryPort) =>
        new GetCompanyResponseStatsUseCase(repo),
      inject: [ApplicationTrackerRepositoryPort],
    },
    {
      provide: RunAntiGhostingSweepUseCase,
      useFactory: (
        repo: AntiGhostingRepositoryPort,
        emailer: AntiGhostingEmailerPort,
        logger: LoggerPort,
      ) => new RunAntiGhostingSweepUseCase(repo, emailer, logger),
      inject: [AntiGhostingRepositoryPort, AntiGhostingEmailerPort, LoggerPort],
    },

    // ----- Catalog use cases -----
    {
      provide: ListJobsUseCase,
      useFactory: (
        repo: JobsRepositoryPort,
        enrichment: JobEnrichmentService,
        logger: LoggerPort,
      ) => new ListJobsUseCase(repo, enrichment, logger),
      inject: [JobsRepositoryPort, JobEnrichmentService, LoggerPort],
    },
    {
      provide: ListJobsWithFitScoreUseCase,
      useFactory: (
        listJobs: ListJobsUseCase,
        batch: FitScoreBatchService,
        logger: LoggerPort,
      ) => new ListJobsWithFitScoreUseCase(listJobs, batch, logger),
      inject: [ListJobsUseCase, FitScoreBatchService, LoggerPort],
    },
    {
      provide: ListMyJobsUseCase,
      useFactory: (repo: JobsRepositoryPort) => new ListMyJobsUseCase(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: ListBookmarkedJobsUseCase,
      useFactory: (repo: JobsRepositoryPort) => new ListBookmarkedJobsUseCase(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: ListRecommendedJobsUseCase,
      useFactory: (
        repo: JobsRepositoryPort,
        enrichment: JobEnrichmentService,
        logger: LoggerPort,
      ) => new ListRecommendedJobsUseCase(repo, enrichment, logger),
      inject: [JobsRepositoryPort, JobEnrichmentService, LoggerPort],
    },
    {
      provide: ListMyApplicationsUseCase,
      useFactory: (repo: JobsRepositoryPort) => new ListMyApplicationsUseCase(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: ListJobApplicationsUseCase,
      useFactory: (repo: JobsRepositoryPort) => new ListJobApplicationsUseCase(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: FindSimilarJobsUseCase,
      useFactory: (
        repo: JobsRepositoryPort,
        enrichment: JobEnrichmentService,
        logger: LoggerPort,
      ) => new FindSimilarJobsUseCase(repo, enrichment, logger),
      inject: [JobsRepositoryPort, JobEnrichmentService, LoggerPort],
    },
    {
      provide: GetJobUseCase,
      useFactory: (
        repo: JobsRepositoryPort,
        enrichment: JobEnrichmentService,
        logger: LoggerPort,
      ) => new GetJobUseCase(repo, enrichment, logger),
      inject: [JobsRepositoryPort, JobEnrichmentService, LoggerPort],
    },
    {
      provide: GetJobFitUseCase,
      useFactory: (
        repo: JobsRepositoryPort,
        matcher: ResumeJobMatcherPort,
        logger: LoggerPort,
      ) => new GetJobFitUseCase(repo, matcher, logger),
      inject: [JobsRepositoryPort, ResumeJobMatcherPort, LoggerPort],
    },
    {
      provide: BookmarkJobUseCase,
      useFactory: (repo: JobsRepositoryPort) => new BookmarkJobUseCase(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: UnbookmarkJobUseCase,
      useFactory: (repo: JobsRepositoryPort) => new UnbookmarkJobUseCase(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: ApplyToJobUseCase,
      useFactory: (
        repo: JobsRepositoryPort,
        tracker: ApplicationTrackerPort,
        logger: LoggerPort,
      ) => new ApplyToJobUseCase(repo, tracker, logger),
      inject: [JobsRepositoryPort, ApplicationTrackerPort, LoggerPort],
    },
    {
      provide: WithdrawApplicationUseCase,
      useFactory: (repo: JobsRepositoryPort) => new WithdrawApplicationUseCase(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: ImportJobFromUrlUseCase,
      useFactory: (svc: JobImportService) => new ImportJobFromUrlUseCase(svc),
      inject: [JobImportService],
    },
    {
      provide: CreateJobUseCase,
      useFactory: (repo: JobsRepositoryPort) => new CreateJobUseCase(repo),
      inject: [JobsRepositoryPort],
    },
    {
      provide: UpdateJobUseCase,
      useFactory: (
        repo: JobsRepositoryPort,
        events: EventPublisherPort,
        logger: LoggerPort,
      ) => new UpdateJobUseCase(repo, events, logger),
      inject: [JobsRepositoryPort, EventPublisherPort, LoggerPort],
    },
    {
      provide: DeleteJobUseCase,
      useFactory: (repo: JobsRepositoryPort) => new DeleteJobUseCase(repo),
      inject: [JobsRepositoryPort],
    },

    // Workers stay Nest-managed.
    AntiGhostingWorker,
  ],
  exports: [
    EnsureSubmittedEventUseCase,
    ApplicationTrackerPort,
    ListApplicationTimelineUseCase,
    RecordApplicationEventUseCase,
    GetCompanyResponseStatsUseCase,
    RunAntiGhostingSweepUseCase,
    ListJobsUseCase,
  ],
})
export class JobsModule {}
