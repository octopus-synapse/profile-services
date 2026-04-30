/**
 * Outbound port for jobs persistence.
 *
 * Aggregates every Prisma read/write the jobs slice needs: job CRUD,
 * applications, bookmarks, candidate skill collection, and the small
 * "for each job, did the viewer bookmark / apply" lookups used to
 * decorate listings.
 *
 * Adapters are responsible for translating Prisma errors into domain
 * exceptions where it makes sense; raw not-found is signalled by
 * returning `null` so use cases can throw the BC's typed exception.
 */

import type { PaginatedResult } from '@/shared-kernel/database';
import type {
  ApplicationCandidate,
  CreateJobInput,
  Job,
  JobApplication,
  JobAuthor,
  JobFilters,
  UpdateJobInput,
} from '../entities/job';

export interface JobWithAuthor extends Job {
  readonly author: JobAuthor | null;
}

export interface ApplicationWithJob extends JobApplication {
  readonly job: JobWithAuthor;
}

export interface BookmarkWithJob {
  readonly createdAt: Date;
  readonly job: JobWithAuthor;
}

export interface ApplicationListItem {
  readonly id: string;
  readonly userId: string;
  readonly status: JobApplication['status'];
  readonly createdAt: Date;
  readonly coverLetter: string | null;
  readonly resumeId: string | null;
  readonly tailoredVersionId: string | null;
}

export abstract class JobsRepositoryPort {
  // -------- Jobs CRUD --------
  abstract createJob(authorId: string, dto: CreateJobInput): Promise<Job>;
  abstract findJobById(id: string): Promise<Job | null>;
  abstract findJobByIdWithAuthor(id: string): Promise<JobWithAuthor | null>;
  abstract findJobOwnerSummary(id: string): Promise<{ id: string; authorId: string } | null>;
  abstract updateJob(id: string, data: UpdateJobInput): Promise<Job>;
  abstract deleteJob(id: string): Promise<Job>;

  // -------- Listing --------
  abstract listJobs(filters: JobFilters): Promise<PaginatedResult<Job>>;
  abstract listJobsByAuthor(
    authorId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Job>>;

  // -------- Recommendations / similar --------
  abstract findRecommendableCandidates(params: {
    excludeAuthorId: string;
    skills: string[];
    take: number;
  }): Promise<Job[]>;
  abstract findSimilarCandidates(params: {
    excludeJobId: string;
    skills: string[];
    take: number;
  }): Promise<JobWithAuthor[]>;

  // -------- Applications --------
  abstract findApplication(jobId: string, userId: string): Promise<JobApplication | null>;
  abstract createApplication(input: {
    jobId: string;
    userId: string;
    coverLetter: string | null;
    resumeId: string | null;
  }): Promise<JobApplication>;
  abstract markApplicationWithdrawn(applicationId: string): Promise<void>;
  abstract listMyApplications(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: ApplicationWithJob[]; total: number }>;
  abstract listApplicationsByJob(
    jobId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: ApplicationListItem[]; total: number }>;
  abstract findUsersByIds(userIds: string[]): Promise<ApplicationCandidate[]>;

  // -------- Bookmarks --------
  abstract findBookmark(jobId: string, userId: string): Promise<{ id: string } | null>;
  abstract createBookmark(jobId: string, userId: string): Promise<void>;
  abstract deleteBookmarks(jobId: string, userId: string): Promise<void>;
  abstract listBookmarkedJobs(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: BookmarkWithJob[]; total: number }>;

  // -------- Decoration --------
  abstract findBookmarkedJobIds(userId: string, jobIds: string[]): Promise<Set<string>>;
  abstract findActiveApplicationJobIds(userId: string, jobIds: string[]): Promise<Set<string>>;

  // -------- Resume / user lookup helpers --------
  abstract getPrimaryResumeId(userId: string): Promise<string | null>;
  abstract collectUserSkills(userId: string): Promise<string[]>;
}
