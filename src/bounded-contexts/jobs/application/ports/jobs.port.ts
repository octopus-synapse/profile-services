/**
 * Bundle token for the jobs BC. Doubles as the TypeScript shape and
 * the Nest DI token. Wiring lives in `jobs.composition.ts` — Nest-free.
 */

import type { ApplyToJobUseCase } from '../use-cases/apply-to-job/apply-to-job.use-case';
import type { BookmarkJobUseCase } from '../use-cases/bookmark-job/bookmark-job.use-case';
import type { CreateJobUseCase } from '../use-cases/create-job/create-job.use-case';
import type { DeleteJobUseCase } from '../use-cases/delete-job/delete-job.use-case';
import type { EnsureSubmittedEventUseCase } from '../use-cases/ensure-submitted-event/ensure-submitted-event.use-case';
import type { FindSimilarJobsUseCase } from '../use-cases/find-similar-jobs/find-similar-jobs.use-case';
import type { GetCompanyResponseStatsUseCase } from '../use-cases/get-company-response-stats/get-company-response-stats.use-case';
import type { GetJobUseCase } from '../use-cases/get-job/get-job.use-case';
import type { GetJobFitUseCase } from '../use-cases/get-job-fit/get-job-fit.use-case';
import type { ImportJobFromUrlUseCase } from '../use-cases/import-job-from-url/import-job-from-url.use-case';
import type { ListApplicationTimelineUseCase } from '../use-cases/list-application-timeline/list-application-timeline.use-case';
import type { ListBookmarkedJobsUseCase } from '../use-cases/list-bookmarked-jobs/list-bookmarked-jobs.use-case';
import type { ListExternalJobsUseCase } from '../use-cases/list-external-jobs/list-external-jobs.use-case';
import type { ListJobApplicationsUseCase } from '../use-cases/list-job-applications/list-job-applications.use-case';
import type { ListJobsUseCase } from '../use-cases/list-jobs/list-jobs.use-case';
import type { ListJobsWithFitScoreUseCase } from '../use-cases/list-jobs-with-fit-score/list-jobs-with-fit-score.use-case';
import type { ListMyApplicationsUseCase } from '../use-cases/list-my-applications/list-my-applications.use-case';
import type { ListMyJobsUseCase } from '../use-cases/list-my-jobs/list-my-jobs.use-case';
import type { ListRecommendedJobsUseCase } from '../use-cases/list-recommended-jobs/list-recommended-jobs.use-case';
import type { RecordApplicationEventUseCase } from '../use-cases/record-application-event/record-application-event.use-case';
import type { RunAntiGhostingSweepUseCase } from '../use-cases/run-anti-ghosting-sweep/run-anti-ghosting-sweep.use-case';
import type { RunExternalJobsIngestionUseCase } from '../use-cases/run-external-jobs-ingestion/run-external-jobs-ingestion.use-case';
import type { UnbookmarkJobUseCase } from '../use-cases/unbookmark-job/unbookmark-job.use-case';
import type { UpdateJobUseCase } from '../use-cases/update-job/update-job.use-case';
import type { WithdrawApplicationUseCase } from '../use-cases/withdraw-application/withdraw-application.use-case';

export abstract class JobsUseCases {
  // Catalog
  abstract readonly listJobs: ListJobsUseCase;
  abstract readonly listJobsWithFitScore: ListJobsWithFitScoreUseCase;
  abstract readonly listMyJobs: ListMyJobsUseCase;
  abstract readonly listBookmarkedJobs: ListBookmarkedJobsUseCase;
  abstract readonly listRecommendedJobs: ListRecommendedJobsUseCase;
  abstract readonly listMyApplications: ListMyApplicationsUseCase;
  abstract readonly listJobApplications: ListJobApplicationsUseCase;
  abstract readonly findSimilarJobs: FindSimilarJobsUseCase;
  abstract readonly getJob: GetJobUseCase;
  abstract readonly getJobFit: GetJobFitUseCase;
  abstract readonly bookmarkJob: BookmarkJobUseCase;
  abstract readonly unbookmarkJob: UnbookmarkJobUseCase;
  abstract readonly applyToJob: ApplyToJobUseCase;
  abstract readonly withdrawApplication: WithdrawApplicationUseCase;
  abstract readonly importJobFromUrl: ImportJobFromUrlUseCase;
  abstract readonly createJob: CreateJobUseCase;
  abstract readonly updateJob: UpdateJobUseCase;
  abstract readonly deleteJob: DeleteJobUseCase;

  // Tracker
  abstract readonly ensureSubmittedEvent: EnsureSubmittedEventUseCase;
  abstract readonly listApplicationTimeline: ListApplicationTimelineUseCase;
  abstract readonly recordApplicationEvent: RecordApplicationEventUseCase;
  abstract readonly getCompanyResponseStats: GetCompanyResponseStatsUseCase;
  abstract readonly runAntiGhostingSweep: RunAntiGhostingSweepUseCase;

  // External listings (JSearch daily batch)
  abstract readonly listExternalJobs: ListExternalJobsUseCase;
  abstract readonly runExternalJobsIngestion: RunExternalJobsIngestionUseCase;
}
