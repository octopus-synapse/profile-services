/**
 * Prisma adapter for `JobsRepositoryPort`. Owns every read/write the
 * jobs slice needs — listings + filters, applications, bookmarks, and
 * the small candidate-skill collector. Keeps SQL-shaped concerns
 * (pagination, search WHERE construction, decorating with author info)
 * out of the application layer.
 */

import type { EnglishLevel, Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { type PaginatedResult, paginate, searchWhere } from '@/shared-kernel/database';
import type {
  ApplicationCandidate,
  CreateJobInput,
  Job,
  JobApplication,
  JobFilters,
  UpdateJobInput,
} from '../../../domain/entities/job.entity';
import {
  type ApplicationListItem,
  type ApplicationWithJob,
  type BookmarkWithJob,
  JobsRepositoryPort,
  type JobWithAuthor,
} from '../../../domain/ports/jobs.repository.port';

const AUTHOR_SELECT = {
  select: { id: true, name: true, username: true, photoURL: true },
} as const;

export class PrismaJobsRepository extends JobsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  // ============================================================================
  // Jobs CRUD
  // ============================================================================
  async createJob(authorId: string, dto: CreateJobInput): Promise<Job> {
    return (await this.prisma.job.create({
      data: {
        authorId,
        title: dto.title,
        company: dto.company,
        location: dto.location,
        jobType: dto.jobType,
        description: dto.description,
        requirements: dto.requirements ?? [],
        skills: dto.skills ?? [],
        salaryRange: dto.salaryRange,
        applyUrl: dto.applyUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        paymentCurrency: dto.paymentCurrency,
        remotePolicy: dto.remotePolicy,
        minEnglishLevel: dto.minEnglishLevel,
      },
    })) as Job;
  }

  async findJobById(id: string): Promise<Job | null> {
    return (await this.prisma.job.findUnique({ where: { id } })) as Job | null;
  }

  async findJobByIdWithAuthor(id: string): Promise<JobWithAuthor | null> {
    return (await this.prisma.job.findUnique({
      where: { id },
      include: { author: AUTHOR_SELECT },
    })) as JobWithAuthor | null;
  }

  async findJobOwnerSummary(id: string): Promise<{ id: string; authorId: string } | null> {
    return this.prisma.job.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
  }

  async updateJob(id: string, data: UpdateJobInput): Promise<Job> {
    const { expiresAt, ...rest } = data;
    return (await this.prisma.job.update({
      where: { id },
      data: { ...rest, expiresAt: expiresAt ? new Date(expiresAt) : undefined },
    })) as Job;
  }

  async deleteJob(id: string): Promise<Job> {
    return (await this.prisma.job.delete({ where: { id } })) as Job;
  }

  // ============================================================================
  // Listing
  // ============================================================================
  async listJobs(filters: JobFilters): Promise<PaginatedResult<Job>> {
    const where = this.buildListingWhere(filters);
    return paginate<Job>(this.prisma.job, {
      page: filters.page,
      pageSize: filters.limit ? Math.min(filters.limit, 100) : undefined,
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listJobsByAuthor(
    authorId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Job>> {
    return paginate<Job>(this.prisma.job, {
      page,
      pageSize: Math.min(pageSize, 100),
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private buildListingWhere(filters: JobFilters): Record<string, unknown> {
    const where: Record<string, unknown> = { isActive: true };

    if (filters.search) {
      where.OR = searchWhere(filters.search, ['title', 'company', 'description']);
    }
    if (filters.jobType) where.jobType = filters.jobType;
    if (filters.skills && filters.skills.length > 0) {
      where.skills = { hasSome: filters.skills };
    }
    if (filters.paymentCurrency && filters.paymentCurrency.length > 0) {
      where.paymentCurrency = { in: filters.paymentCurrency };
    }
    if (filters.remotePolicy && filters.remotePolicy.length > 0) {
      where.remotePolicy = { in: filters.remotePolicy };
    }

    // `minEnglishLevel` on the job is the *required* level. The client filter
    // "I speak at most X" means we should include jobs whose requirement is
    // ≤ X. Coarse CEFR buckets so simple enum ordering is enough.
    if (filters.minEnglishLevel) {
      const order: EnglishLevel[] = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT'];
      const idx = order.indexOf(filters.minEnglishLevel);
      if (idx >= 0) {
        where.OR = [
          ...(((where.OR as unknown[] | undefined) ?? []) as unknown[]),
          { minEnglishLevel: null },
          { minEnglishLevel: { in: order.slice(0, idx + 1) } },
        ];
      }
    }
    return where;
  }

  // ============================================================================
  // Recommendations / similar
  // ============================================================================
  async findRecommendableCandidates(params: {
    excludeAuthorId: string;
    skills: string[];
    take: number;
  }): Promise<Job[]> {
    return (await this.prisma.job.findMany({
      where: {
        isActive: true,
        authorId: { not: params.excludeAuthorId },
        skills: { hasSome: params.skills },
      },
      orderBy: { createdAt: 'desc' },
      take: params.take,
    })) as Job[];
  }

  async findSimilarCandidates(params: {
    excludeJobId: string;
    skills: string[];
    take: number;
  }): Promise<JobWithAuthor[]> {
    return (await this.prisma.job.findMany({
      where: {
        isActive: true,
        id: { not: params.excludeJobId },
        skills: { hasSome: params.skills },
      },
      include: { author: AUTHOR_SELECT },
      orderBy: { createdAt: 'desc' },
      take: params.take,
    })) as JobWithAuthor[];
  }

  // ============================================================================
  // Applications
  // ============================================================================
  async findApplication(jobId: string, userId: string): Promise<JobApplication | null> {
    return (await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    })) as JobApplication | null;
  }

  async createApplication(input: {
    jobId: string;
    userId: string;
    coverLetter: string | null;
    resumeId: string | null;
  }): Promise<JobApplication> {
    return (await this.prisma.jobApplication.create({
      data: {
        jobId: input.jobId,
        userId: input.userId,
        coverLetter: input.coverLetter,
        resumeId: input.resumeId,
      },
    })) as JobApplication;
  }

  async markApplicationWithdrawn(applicationId: string): Promise<void> {
    await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
    });
  }

  async listMyApplications(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: ApplicationWithJob[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const where: Prisma.JobApplicationWhereInput = {
      userId,
      status: { not: 'WITHDRAWN' },
    };
    const [items, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          job: { include: { author: AUTHOR_SELECT } },
        },
      }),
      this.prisma.jobApplication.count({ where }),
    ]);
    return { items: items as unknown as ApplicationWithJob[], total };
  }

  async listApplicationsByJob(
    jobId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: ApplicationListItem[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const where: Prisma.JobApplicationWhereInput = {
      jobId,
      status: { not: 'WITHDRAWN' },
    };
    const [items, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
          coverLetter: true,
          resumeId: true,
          tailoredVersionId: true,
        },
      }),
      this.prisma.jobApplication.count({ where }),
    ]);
    return { items: items as ApplicationListItem[], total };
  }

  async findUsersByIds(userIds: string[]): Promise<ApplicationCandidate[]> {
    if (userIds.length === 0) return [];
    return (await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true, email: true, photoURL: true },
    })) as ApplicationCandidate[];
  }

  // ============================================================================
  // Bookmarks
  // ============================================================================
  async findBookmark(jobId: string, userId: string): Promise<{ id: string } | null> {
    return this.prisma.jobBookmark.findUnique({
      where: { jobId_userId: { jobId, userId } },
      select: { id: true },
    });
  }

  async createBookmark(jobId: string, userId: string): Promise<void> {
    await this.prisma.jobBookmark.create({ data: { jobId, userId } });
  }

  async deleteBookmarks(jobId: string, userId: string): Promise<void> {
    await this.prisma.jobBookmark.deleteMany({ where: { jobId, userId } });
  }

  async listBookmarkedJobs(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: BookmarkWithJob[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const [bookmarks, total] = await Promise.all([
      this.prisma.jobBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          job: { include: { author: AUTHOR_SELECT } },
        },
      }),
      this.prisma.jobBookmark.count({ where: { userId } }),
    ]);
    return { items: bookmarks as unknown as BookmarkWithJob[], total };
  }

  // ============================================================================
  // Decoration
  // ============================================================================
  async findBookmarkedJobIds(userId: string, jobIds: string[]): Promise<Set<string>> {
    if (jobIds.length === 0) return new Set();
    const rows = await this.prisma.jobBookmark.findMany({
      where: { userId, jobId: { in: jobIds } },
      select: { jobId: true },
    });
    return new Set(rows.map((r) => r.jobId));
  }

  async findActiveApplicationJobIds(userId: string, jobIds: string[]): Promise<Set<string>> {
    if (jobIds.length === 0) return new Set();
    const rows = await this.prisma.jobApplication.findMany({
      where: { userId, jobId: { in: jobIds }, status: { not: 'WITHDRAWN' } },
      select: { jobId: true },
    });
    return new Set(rows.map((r) => r.jobId));
  }

  // ============================================================================
  // Resume / user lookup helpers
  // ============================================================================
  async getPrimaryResumeId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });
    return user?.primaryResumeId ?? null;
  }

  /**
   * Collect skill names from the user's resumes — both `primaryStack`
   * (top-level array on the resume) and items inside SKILL-like sections.
   */
  async collectUserSkills(userId: string): Promise<string[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      select: {
        primaryStack: true,
        resumeSections: {
          where: {
            sectionType: {
              semanticKind: { contains: 'SKILL', mode: 'insensitive' },
            },
          },
          select: {
            items: { select: { content: true } },
          },
        },
      },
    });

    const skills = new Set<string>();
    for (const resume of resumes) {
      for (const skill of resume.primaryStack ?? []) {
        if (typeof skill === 'string' && skill.trim()) skills.add(skill.trim());
      }
      for (const section of resume.resumeSections ?? []) {
        for (const item of section.items ?? []) {
          const content = item.content as Record<string, unknown> | null;
          const name = content?.name;
          if (typeof name === 'string' && name.trim()) skills.add(name.trim());
        }
      }
    }
    return [...skills];
  }
}
