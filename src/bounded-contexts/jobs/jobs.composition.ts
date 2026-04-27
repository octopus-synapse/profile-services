/**
 * Pure-TS wiring for the jobs BC. Zero `@nestjs/*` imports.
 *
 * Composes both slices (catalog + tracker) into one bundle. The
 * `EnsureSubmittedEventUseCase` doubles as the catalog-facing
 * `ApplicationTrackerPort` so `ApplyToJobUseCase` can wire it without
 * cross-slice imports — a single instance is shared in both roles.
 */

import type { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import type { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import type { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import type { CronPort } from '@/shared-kernel/jobs/cron.port';
import { JobsUseCases } from './application/ports/jobs.port';
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
import { EmailServiceAntiGhostingEmailerAdapter } from './infrastructure/adapters/external-services/email-service-anti-ghosting-emailer.adapter';
import { ResumeAnalyticsJobMatcherAdapter } from './infrastructure/adapters/external-services/resume-analytics-job-matcher.adapter';
import { PrismaAntiGhostingRepository } from './infrastructure/adapters/persistence/prisma-anti-ghosting.repository';
import { PrismaApplicationTrackerRepository } from './infrastructure/adapters/persistence/prisma-application-tracker.repository';
import { PrismaJobsRepository } from './infrastructure/adapters/persistence/prisma-jobs.repository';
import { AntiGhostingWorker } from './infrastructure/workers/anti-ghosting.worker';

export { JobsUseCases };

export function buildJobsUseCases(
  prisma: PrismaService,
  email: EmailService,
  logger: LoggerPort,
  events: EventPublisherPort,
  llm: LlmPort,
  resumeAnalytics: ResumeAnalyticsFacade,
): JobsUseCases {
  // Repos
  const jobsRepo = new PrismaJobsRepository(prisma, logger);
  const trackerRepo = new PrismaApplicationTrackerRepository(prisma, logger);
  const antiGhostingRepo = new PrismaAntiGhostingRepository(prisma, logger);

  // External adapters
  const antiGhostingEmailer = new EmailServiceAntiGhostingEmailerAdapter(email, logger);
  const matcher = new ResumeAnalyticsJobMatcherAdapter(resumeAnalytics);

  // App services
  const enrichment = new JobEnrichmentService(jobsRepo);
  const fitBatch = new FitScoreBatchService(jobsRepo);
  const importService = new JobImportService(llm);

  // Tracker use cases (one instance of EnsureSubmittedEventUseCase
  // doubles as ApplicationTrackerPort for the catalog).
  const ensureSubmittedEvent = new EnsureSubmittedEventUseCase(trackerRepo);

  const listJobs = new ListJobsUseCase(jobsRepo, enrichment, logger);

  return {
    // Catalog
    listJobs,
    listJobsWithFitScore: new ListJobsWithFitScoreUseCase(listJobs, fitBatch, logger),
    listMyJobs: new ListMyJobsUseCase(jobsRepo),
    listBookmarkedJobs: new ListBookmarkedJobsUseCase(jobsRepo),
    listRecommendedJobs: new ListRecommendedJobsUseCase(jobsRepo, enrichment, logger),
    listMyApplications: new ListMyApplicationsUseCase(jobsRepo),
    listJobApplications: new ListJobApplicationsUseCase(jobsRepo),
    findSimilarJobs: new FindSimilarJobsUseCase(jobsRepo, enrichment, logger),
    getJob: new GetJobUseCase(jobsRepo, enrichment, logger),
    getJobFit: new GetJobFitUseCase(jobsRepo, matcher, logger),
    bookmarkJob: new BookmarkJobUseCase(jobsRepo),
    unbookmarkJob: new UnbookmarkJobUseCase(jobsRepo),
    applyToJob: new ApplyToJobUseCase(jobsRepo, ensureSubmittedEvent, logger),
    withdrawApplication: new WithdrawApplicationUseCase(jobsRepo),
    importJobFromUrl: new ImportJobFromUrlUseCase(importService),
    createJob: new CreateJobUseCase(jobsRepo),
    updateJob: new UpdateJobUseCase(jobsRepo, events, logger),
    deleteJob: new DeleteJobUseCase(jobsRepo),

    // Tracker
    ensureSubmittedEvent,
    listApplicationTimeline: new ListApplicationTimelineUseCase(trackerRepo),
    recordApplicationEvent: new RecordApplicationEventUseCase(trackerRepo),
    getCompanyResponseStats: new GetCompanyResponseStatsUseCase(trackerRepo),
    runAntiGhostingSweep: new RunAntiGhostingSweepUseCase(
      antiGhostingRepo,
      antiGhostingEmailer,
      logger,
    ),
  };
}

/**
 * Registers the daily anti-ghosting cron sweep against the shared
 * `CronPort`. Called once at app boot from the Nest module via a
 * side-effect provider.
 *
 * Schedule: every day at 09:00 (`EVERY_DAY_AT_9AM` → '0 9 * * *').
 */
export function registerJobsJobs(
  cron: CronPort,
  bundle: JobsUseCases,
  logger: LoggerPort,
): void {
  const antiGhosting = new AntiGhostingWorker(bundle, logger);
  cron.register({ pattern: '0 9 * * *' }, antiGhosting.run.bind(antiGhosting));
}
