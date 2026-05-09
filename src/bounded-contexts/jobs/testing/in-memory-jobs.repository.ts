/**
 * In-memory `JobsRepositoryPort` for use case specs. Honors the same
 * filter / pagination contract as the Prisma adapter (active-only by
 * default, skill `hasSome`, English-level "max accepted" semantics)
 * so tests exercise the same branching without spinning up a DB.
 */

import { randomUUID } from 'node:crypto';
import type { JobApplicationStatus } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';
import type {
  ApplicationCandidate,
  CreateJobInput,
  Job,
  JobApplication,
  JobAuthor,
  JobFilters,
  UpdateJobInput,
} from '../domain/entities/job.entity';
import {
  type ApplicationListItem,
  type ApplicationWithJob,
  type BookmarkWithJob,
  JobsRepositoryPort,
  type JobWithAuthor,
} from '../domain/ports/jobs.repository.port';

interface BookmarkRow {
  readonly id: string;
  readonly jobId: string;
  readonly userId: string;
  readonly createdAt: Date;
}

interface UserRow extends ApplicationCandidate {
  readonly primaryResumeId: string | null;
  readonly skills: string[];
}

function clone<T>(value: T): T {
  return value === null || typeof value !== 'object'
    ? value
    : (JSON.parse(JSON.stringify(value)) as T);
}

function defaultJob(partial: Partial<Job> & { authorId: string; title: string }): Job {
  const now = new Date();
  return {
    id: partial.id ?? randomUUID(),
    authorId: partial.authorId,
    title: partial.title,
    company: partial.company ?? '',
    location: partial.location ?? null,
    jobType: partial.jobType ?? ('FULL_TIME' as Job['jobType']),
    description: partial.description ?? '',
    requirements: partial.requirements ?? [],
    skills: partial.skills ?? [],
    salaryRange: partial.salaryRange ?? null,
    applyUrl: partial.applyUrl ?? null,
    isActive: partial.isActive ?? true,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    expiresAt: partial.expiresAt ?? null,
    paymentCurrency: partial.paymentCurrency ?? null,
    remotePolicy: partial.remotePolicy ?? null,
    minEnglishLevel: partial.minEnglishLevel ?? null,
  };
}

const ENGLISH_ORDER = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT'] as const;

export class InMemoryJobsRepository extends JobsRepositoryPort {
  readonly jobs = new Map<string, Job>();
  readonly applications: JobApplication[] = [];
  readonly bookmarks: BookmarkRow[] = [];
  readonly users = new Map<string, UserRow>();

  // -------- seed helpers --------
  seedJob(partial: Partial<Job> & { authorId: string; title: string }): Job {
    const job = defaultJob(partial);
    this.jobs.set(job.id, job);
    return job;
  }

  seedUser(row: Partial<UserRow> & { id: string }): UserRow {
    const full: UserRow = {
      id: row.id,
      name: row.name ?? null,
      username: row.username ?? null,
      email: row.email ?? `${row.id}@example.com`,
      photoURL: row.photoURL ?? null,
      primaryResumeId: row.primaryResumeId ?? null,
      skills: row.skills ?? [],
    };
    this.users.set(full.id, full);
    return full;
  }

  seedApplication(app: JobApplication): JobApplication {
    this.applications.push(app);
    return app;
  }

  seedBookmark(jobId: string, userId: string, createdAt = new Date()): BookmarkRow {
    const row: BookmarkRow = { id: randomUUID(), jobId, userId, createdAt };
    this.bookmarks.push(row);
    return row;
  }

  private authorOf(authorId: string): JobAuthor | null {
    const u = this.users.get(authorId);
    if (!u) return null;
    return { id: u.id, name: u.name, username: u.username, photoURL: u.photoURL };
  }

  // ============================================================================
  // Jobs CRUD
  // ============================================================================
  async createJob(authorId: string, dto: CreateJobInput): Promise<Job> {
    const job = defaultJob({
      authorId,
      title: dto.title,
      company: dto.company,
      location: dto.location ?? null,
      jobType: dto.jobType,
      description: dto.description,
      requirements: dto.requirements ?? [],
      skills: dto.skills ?? [],
      salaryRange: dto.salaryRange ?? null,
      applyUrl: dto.applyUrl ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      paymentCurrency: dto.paymentCurrency ?? null,
      remotePolicy: dto.remotePolicy ?? null,
      minEnglishLevel: dto.minEnglishLevel ?? null,
    });
    this.jobs.set(job.id, job);
    return job;
  }

  async findJobById(id: string): Promise<Job | null> {
    return this.jobs.get(id) ? clone(this.jobs.get(id)!) : null;
  }

  async findJobByIdWithAuthor(id: string): Promise<JobWithAuthor | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    return { ...clone(job), author: this.authorOf(job.authorId) };
  }

  async findJobOwnerSummary(id: string): Promise<{ id: string; authorId: string } | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    return { id: job.id, authorId: job.authorId };
  }

  async updateJob(id: string, data: UpdateJobInput): Promise<Job> {
    const current = this.jobs.get(id);
    if (!current) throw new Error(`Job ${id} not found`);
    const { expiresAt, ...rest } = data;
    const next: Job = {
      ...current,
      ...(rest as Partial<Job>),
      expiresAt: expiresAt ? new Date(expiresAt) : current.expiresAt,
      updatedAt: new Date(),
    };
    this.jobs.set(id, next);
    return clone(next);
  }

  async deleteJob(id: string): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);
    this.jobs.delete(id);
    return clone(job);
  }

  // ============================================================================
  // Listing
  // ============================================================================
  private filterAll(filters: JobFilters): Job[] {
    let rows = [...this.jobs.values()].filter((j) => j.isActive);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q),
      );
    }
    if (filters.jobType) rows = rows.filter((j) => j.jobType === filters.jobType);
    if (filters.skills && filters.skills.length > 0) {
      const set = new Set(filters.skills);
      rows = rows.filter((j) => (j.skills ?? []).some((s) => set.has(s)));
    }
    if (filters.paymentCurrency && filters.paymentCurrency.length > 0) {
      const set = new Set(filters.paymentCurrency);
      rows = rows.filter((j) => j.paymentCurrency !== null && set.has(j.paymentCurrency));
    }
    if (filters.remotePolicy && filters.remotePolicy.length > 0) {
      const set = new Set(filters.remotePolicy);
      rows = rows.filter((j) => j.remotePolicy !== null && set.has(j.remotePolicy));
    }
    if (filters.minEnglishLevel) {
      const idx = ENGLISH_ORDER.indexOf(filters.minEnglishLevel);
      if (idx >= 0) {
        const accepted = new Set(ENGLISH_ORDER.slice(0, idx + 1));
        rows = rows.filter((j) => j.minEnglishLevel === null || accepted.has(j.minEnglishLevel));
      }
    }

    return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listJobs(filters: JobFilters): Promise<PaginatedResult<Job>> {
    const rows = this.filterAll(filters);
    const page = filters.page ?? 1;
    const limit = filters.limit ? Math.min(filters.limit, 100) : 20;
    const total = rows.length;
    const items = rows.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(total / limit);
    return {
      items: items.map(clone),
      total,
      page,
      limit,
      totalPages,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  async listJobsByAuthor(
    authorId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Job>> {
    const limit = Math.min(pageSize, 100);
    const rows = [...this.jobs.values()]
      .filter((j) => j.authorId === authorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = rows.length;
    const items = rows.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(total / limit);
    return {
      items: items.map(clone),
      total,
      page,
      limit,
      totalPages,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  // ============================================================================
  // Recommendations / similar
  // ============================================================================
  async findRecommendableCandidates(params: {
    excludeAuthorId: string;
    skills: string[];
    take: number;
  }): Promise<Job[]> {
    const set = new Set(params.skills);
    return [...this.jobs.values()]
      .filter(
        (j) =>
          j.isActive &&
          j.authorId !== params.excludeAuthorId &&
          (j.skills ?? []).some((s) => set.has(s)),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, params.take)
      .map(clone);
  }

  async findSimilarCandidates(params: {
    excludeJobId: string;
    skills: string[];
    take: number;
  }): Promise<JobWithAuthor[]> {
    const set = new Set(params.skills);
    return [...this.jobs.values()]
      .filter(
        (j) =>
          j.isActive && j.id !== params.excludeJobId && (j.skills ?? []).some((s) => set.has(s)),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, params.take)
      .map((j) => ({ ...clone(j), author: this.authorOf(j.authorId) }));
  }

  // ============================================================================
  // Applications
  // ============================================================================
  async findApplication(jobId: string, userId: string): Promise<JobApplication | null> {
    const row = this.applications.find((a) => a.jobId === jobId && a.userId === userId);
    return row ? clone(row) : null;
  }

  async createApplication(input: {
    jobId: string;
    userId: string;
    coverLetter: string | null;
    resumeId: string | null;
  }): Promise<JobApplication> {
    const row: JobApplication = {
      id: randomUUID(),
      jobId: input.jobId,
      userId: input.userId,
      status: 'SUBMITTED' as JobApplicationStatus,
      coverLetter: input.coverLetter,
      resumeId: input.resumeId,
      tailoredVersionId: null,
      createdAt: new Date(),
    };
    this.applications.push(row);
    return clone(row);
  }

  async markApplicationWithdrawn(applicationId: string): Promise<void> {
    const idx = this.applications.findIndex((a) => a.id === applicationId);
    if (idx < 0) return;
    const current = this.applications[idx];
    this.applications[idx] = { ...current, status: 'WITHDRAWN' as JobApplicationStatus };
  }

  async listMyApplications(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: ApplicationWithJob[]; total: number }> {
    const rows = this.applications
      .filter((a) => a.userId === userId && a.status !== 'WITHDRAWN')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, page * pageSize).map((a) => {
      const job = this.jobs.get(a.jobId);
      const withAuthor: JobWithAuthor | null = job
        ? { ...clone(job), author: this.authorOf(job.authorId) }
        : null;
      return { ...clone(a), job: withAuthor as JobWithAuthor };
    });
    return { items, total };
  }

  async listApplicationsByJob(
    jobId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: ApplicationListItem[]; total: number }> {
    const rows = this.applications
      .filter((a) => a.jobId === jobId && a.status !== 'WITHDRAWN')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, page * pageSize).map((a) => ({
      id: a.id,
      userId: a.userId,
      status: a.status,
      createdAt: a.createdAt,
      coverLetter: a.coverLetter,
      resumeId: a.resumeId,
      tailoredVersionId: a.tailoredVersionId,
    }));
    return { items, total };
  }

  async findUsersByIds(userIds: string[]): Promise<ApplicationCandidate[]> {
    if (userIds.length === 0) return [];
    const set = new Set(userIds);
    return [...this.users.values()]
      .filter((u) => set.has(u.id))
      .map(({ id, name, username, email, photoURL }) => ({ id, name, username, email, photoURL }));
  }

  // ============================================================================
  // Bookmarks
  // ============================================================================
  async findBookmark(jobId: string, userId: string): Promise<{ id: string } | null> {
    const row = this.bookmarks.find((b) => b.jobId === jobId && b.userId === userId);
    return row ? { id: row.id } : null;
  }

  async createBookmark(jobId: string, userId: string): Promise<void> {
    if (this.bookmarks.some((b) => b.jobId === jobId && b.userId === userId)) {
      return;
    }
    this.bookmarks.push({ id: randomUUID(), jobId, userId, createdAt: new Date() });
  }

  async deleteBookmarks(jobId: string, userId: string): Promise<void> {
    for (let i = this.bookmarks.length - 1; i >= 0; i--) {
      if (this.bookmarks[i].jobId === jobId && this.bookmarks[i].userId === userId) {
        this.bookmarks.splice(i, 1);
      }
    }
  }

  async listBookmarkedJobs(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: BookmarkWithJob[]; total: number }> {
    const rows = this.bookmarks
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, page * pageSize).map((b) => {
      const job = this.jobs.get(b.jobId);
      const withAuthor: JobWithAuthor | null = job
        ? { ...clone(job), author: this.authorOf(job.authorId) }
        : null;
      return { createdAt: b.createdAt, job: withAuthor as JobWithAuthor };
    });
    return { items, total };
  }

  // ============================================================================
  // Decoration
  // ============================================================================
  async findBookmarkedJobIds(userId: string, jobIds: string[]): Promise<Set<string>> {
    const set = new Set(jobIds);
    return new Set(
      this.bookmarks.filter((b) => b.userId === userId && set.has(b.jobId)).map((b) => b.jobId),
    );
  }

  async findActiveApplicationJobIds(userId: string, jobIds: string[]): Promise<Set<string>> {
    const set = new Set(jobIds);
    return new Set(
      this.applications
        .filter((a) => a.userId === userId && a.status !== 'WITHDRAWN' && set.has(a.jobId))
        .map((a) => a.jobId),
    );
  }

  // ============================================================================
  // Resume / user lookup helpers
  // ============================================================================
  async getPrimaryResumeId(userId: string): Promise<string | null> {
    return this.users.get(userId)?.primaryResumeId ?? null;
  }

  async collectUserSkills(userId: string): Promise<string[]> {
    const u = this.users.get(userId);
    return u ? [...u.skills] : [];
  }
}
