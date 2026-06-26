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
import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import type { SafeFetchPort } from '@/shared-kernel/http/safe-fetch.port';
import type { CronPort } from '@/shared-kernel/jobs/cron.port';
import { JobsUseCases } from './application/ports/jobs.port';
import { ExternalJobsIngestionService } from './application/services/external-jobs-ingestion.service';
import { FitScoreBatchService } from './application/services/fit-score-batch.service';
import { JobEnrichmentService } from './application/services/job-enrichment.service';
import { JobImportService } from './application/services/job-import.service';
import { JSearchQuotaService } from './application/services/jsearch-quota.service';
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
import { ListExternalJobsUseCase } from './application/use-cases/list-external-jobs/list-external-jobs.use-case';
import { ListJobApplicationsUseCase } from './application/use-cases/list-job-applications/list-job-applications.use-case';
import { ListJobsUseCase } from './application/use-cases/list-jobs/list-jobs.use-case';
import { ListJobsWithFitScoreUseCase } from './application/use-cases/list-jobs-with-fit-score/list-jobs-with-fit-score.use-case';
import { ListMyApplicationsUseCase } from './application/use-cases/list-my-applications/list-my-applications.use-case';
import { ListMyJobsUseCase } from './application/use-cases/list-my-jobs/list-my-jobs.use-case';
import { ListRecommendedJobsUseCase } from './application/use-cases/list-recommended-jobs/list-recommended-jobs.use-case';
import { ListSavedExternalJobsUseCase } from './application/use-cases/list-saved-external-jobs/list-saved-external-jobs.use-case';
import { MarkExternalJobAppliedUseCase } from './application/use-cases/mark-external-job-applied/mark-external-job-applied.use-case';
import { RecordApplicationEventUseCase } from './application/use-cases/record-application-event/record-application-event.use-case';
import { RunAntiGhostingSweepUseCase } from './application/use-cases/run-anti-ghosting-sweep/run-anti-ghosting-sweep.use-case';
import { RunExternalJobsIngestionUseCase } from './application/use-cases/run-external-jobs-ingestion/run-external-jobs-ingestion.use-case';
import { SaveExternalJobUseCase } from './application/use-cases/save-external-job/save-external-job.use-case';
import { UnbookmarkJobUseCase } from './application/use-cases/unbookmark-job/unbookmark-job.use-case';
import { UnsaveExternalJobUseCase } from './application/use-cases/unsave-external-job/unsave-external-job.use-case';
import { UpdateJobUseCase } from './application/use-cases/update-job/update-job.use-case';
import { WithdrawApplicationUseCase } from './application/use-cases/withdraw-application/withdraw-application.use-case';
import { externalJobsRoutes } from './external-jobs.routes';
import { EmailServiceAntiGhostingEmailerAdapter } from './infrastructure/adapters/external-services/email-service-anti-ghosting-emailer.adapter';
import { JSearchJobSearchAdapter } from './infrastructure/adapters/external-services/jsearch-job-search.adapter';
import { NotConfiguredExternalJobSearchAdapter } from './infrastructure/adapters/external-services/not-configured-external-job-search.adapter';
import { ResumeAnalyticsJobMatcherAdapter } from './infrastructure/adapters/external-services/resume-analytics-job-matcher.adapter';
import { PrismaAntiGhostingRepository } from './infrastructure/adapters/persistence/prisma-anti-ghosting.repository';
import { PrismaApplicationTrackerRepository } from './infrastructure/adapters/persistence/prisma-application-tracker.repository';
import { PrismaExternalJobListingsRepository } from './infrastructure/adapters/persistence/prisma-external-job-listings.repository';
import { PrismaJobsRepository } from './infrastructure/adapters/persistence/prisma-jobs.repository';
import { PrismaSavedExternalJobsRepository } from './infrastructure/adapters/persistence/prisma-saved-external-jobs.repository';
import { AntiGhostingWorker } from './infrastructure/workers/anti-ghosting.worker';
import { ExternalJobsIngestionWorker } from './infrastructure/workers/external-jobs-ingestion.worker';
import { jobsRoutes } from './jobs.routes';
import { jobsTrackerRoutes } from './jobs-tracker.routes';

export { JobsUseCases };

export function buildJobsUseCases(
  prisma: PrismaService,
  email: EmailService,
  logger: LoggerPort,
  events: EventPublisherPort,
  llm: LlmPort,
  resumeAnalytics: ResumeAnalyticsFacade,
  safeFetch: SafeFetchPort,
  cache: CachePort,
  config: ConfigPort,
): JobsUseCases {
  // Repos
  const jobsRepo = new PrismaJobsRepository(prisma, logger);
  const trackerRepo = new PrismaApplicationTrackerRepository(prisma, logger);
  const antiGhostingRepo = new PrismaAntiGhostingRepository(prisma, logger);
  const externalListingsRepo = new PrismaExternalJobListingsRepository(prisma, logger);
  const savedExternalJobsRepo = new PrismaSavedExternalJobsRepository(prisma);

  // External adapters
  const antiGhostingEmailer = new EmailServiceAntiGhostingEmailerAdapter(email, logger);
  const matcher = new ResumeAnalyticsJobMatcherAdapter(resumeAnalytics);
  const externalJobSearch = buildExternalJobSearchAdapter(config, logger);

  // App services
  const enrichment = new JobEnrichmentService(jobsRepo);
  const fitBatch = new FitScoreBatchService(jobsRepo);
  const importService = new JobImportService(llm, safeFetch);

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

    // External listings (JSearch daily batch)
    listExternalJobs: new ListExternalJobsUseCase(
      externalListingsRepo,
      savedExternalJobsRepo,
      logger,
    ),
    saveExternalJob: new SaveExternalJobUseCase(
      externalListingsRepo,
      savedExternalJobsRepo,
      logger,
    ),
    unsaveExternalJob: new UnsaveExternalJobUseCase(savedExternalJobsRepo),
    markExternalJobApplied: new MarkExternalJobAppliedUseCase(savedExternalJobsRepo),
    listSavedExternalJobs: new ListSavedExternalJobsUseCase(savedExternalJobsRepo),
    runExternalJobsIngestion: new RunExternalJobsIngestionUseCase(
      new ExternalJobsIngestionService(
        externalJobSearch,
        externalListingsRepo,
        new JSearchQuotaService(cache),
        logger,
      ),
    ),
  };
}

/**
 * JSearch is optional: without the RapidAPI key/host the ingestion cron
 * is not registered (see `registerJobsJobs`) and the wired adapter fails
 * loud if something still invokes it. The read route keeps serving
 * whatever is already in Postgres either way.
 */
function buildExternalJobSearchAdapter(config: ConfigPort, logger: LoggerPort) {
  const apiKey = config.env.JSEARCH_RAPIDAPI_KEY;
  const apiHost = config.env.JSEARCH_RAPIDAPI_HOST;
  if (!apiKey || !apiHost) {
    logger.warn(
      'JSEARCH_RAPIDAPI_KEY/HOST not set — external job ingestion disabled',
      'JobsComposition',
    );
    return new NotConfiguredExternalJobSearchAdapter();
  }
  return new JSearchJobSearchAdapter(apiKey, apiHost, logger);
}

/** True when the JSearch ingestion cron should be scheduled. */
export function isExternalJobsIngestionEnabled(config: ConfigPort): boolean {
  return Boolean(config.env.JSEARCH_RAPIDAPI_KEY && config.env.JSEARCH_RAPIDAPI_HOST);
}

export function buildJobsComposition(
  prisma: PrismaService,
  email: EmailService,
  logger: LoggerPort,
  events: EventPublisherPort,
  llm: LlmPort,
  resumeAnalytics: ResumeAnalyticsFacade,
  safeFetch: SafeFetchPort,
  cache: CachePort,
  config: ConfigPort,
): BoundedContextComposition<JobsUseCases> {
  const useCases = buildJobsUseCases(
    prisma,
    email,
    logger,
    events,
    llm,
    resumeAnalytics,
    safeFetch,
    cache,
    config,
  );

  return {
    useCases,
    // External routes first: `/v1/jobs/external` is static and must not
    // be shadowed by `/v1/jobs/:id`. Tracker/import routes
    // (`/v1/jobs/applications/*`, `/v1/jobs/import-from-url`) are static
    // too, so order them before the dynamic `/v1/jobs/:id` catalog routes.
    routes: [...externalJobsRoutes, ...jobsTrackerRoutes, ...jobsRoutes],
  };
}

/**
 * Registers the jobs BC cron workers against the shared `CronPort`.
 * Called once at app boot.
 *
 * - Anti-ghosting sweep: every day at 09:00 ('0 9 * * *').
 * - External jobs (JSearch) ingestion: every day at 06:00
 *   America/Sao_Paulo — only when `externalIngestionEnabled` (RapidAPI
 *   key/host present); a cron firing into the not-configured adapter
 *   would just throw daily.
 */
export function registerJobsJobs(
  cron: CronPort,
  bundle: JobsUseCases,
  logger: LoggerPort,
  lock: DistributedLockPort,
  options: { externalIngestionEnabled?: boolean } = {},
): void {
  const antiGhosting = new AntiGhostingWorker(bundle, logger, lock);
  cron.register({ pattern: '0 9 * * *' }, antiGhosting.run.bind(antiGhosting));

  if (options.externalIngestionEnabled) {
    const externalIngestion = new ExternalJobsIngestionWorker(bundle, logger, lock);
    cron.register(
      { pattern: '0 6 * * *', tz: 'America/Sao_Paulo' },
      externalIngestion.run.bind(externalIngestion),
    );
  }
}
