import { Injectable } from '@nestjs/common';
import type { EnglishLevel, JobType, PaymentCurrency, RemotePolicy } from '@prisma/client';
import { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate, searchWhere } from '@/shared-kernel/database';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { ApplicationTrackerService } from '../tracker/application-tracker.service';

/** 0–100 coverage of `needles` that appear (case-insensitively) in `haystack`. */
function percentOverlap(needles: string[], haystack: string[]): number {
  if (needles.length === 0) return 0;
  const hs = new Set(haystack.map((h) => h.toLowerCase()));
  const hit = needles.filter((n) => hs.has(n.toLowerCase())).length;
  return Math.round((hit / needles.length) * 100);
}

/**
 * Coarse soft-skill signal extractor. Scans free-form text for the usual
 * suspects so we have *something* to feed into the soft-skills dimension
 * until the skills catalog exposes a canonical list.
 */
function extractSoftSignals(text: string | null | undefined): string[] {
  if (!text) return [];
  const vocab = [
    'communication',
    'collaboration',
    'leadership',
    'ownership',
    'mentorship',
    'problem-solving',
    'autonomy',
    'teamwork',
    'english',
    'portuguese',
    'stakeholder',
    'presentation',
  ];
  const lower = text.toLowerCase();
  return vocab.filter((v) => lower.includes(v));
}

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeAnalytics: ResumeAnalyticsFacade,
    private readonly tracker: ApplicationTrackerService,
  ) {}

  async create(
    authorId: string,
    dto: {
      title: string;
      company: string;
      location?: string;
      jobType: JobType;
      description: string;
      requirements?: string[];
      skills?: string[];
      salaryRange?: string;
      applyUrl?: string;
      expiresAt?: Date;
      paymentCurrency?: PaymentCurrency;
      remotePolicy?: RemotePolicy;
      minEnglishLevel?: EnglishLevel;
    },
  ) {
    return this.prisma.job.create({
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
        expiresAt: dto.expiresAt,
        paymentCurrency: dto.paymentCurrency,
        remotePolicy: dto.remotePolicy,
        minEnglishLevel: dto.minEnglishLevel,
      },
    });
  }

  async findAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      jobType?: JobType;
      skills?: string[];
      paymentCurrency?: PaymentCurrency[];
      remotePolicy?: RemotePolicy[];
      minEnglishLevel?: EnglishLevel;
    },
    viewerId?: string,
  ) {
    const where: Record<string, unknown> = { isActive: true };

    if (query.search) {
      where.OR = searchWhere(query.search, ['title', 'company', 'description']);
    }

    if (query.jobType) {
      where.jobType = query.jobType;
    }

    if (query.skills && query.skills.length > 0) {
      where.skills = { hasSome: query.skills };
    }

    if (query.paymentCurrency && query.paymentCurrency.length > 0) {
      where.paymentCurrency = { in: query.paymentCurrency };
    }

    if (query.remotePolicy && query.remotePolicy.length > 0) {
      where.remotePolicy = { in: query.remotePolicy };
    }

    // `minEnglishLevel` on the job is the *required* level. The client filter
    // "I speak at most X" means we should include jobs whose requirement is
    // ≤ X. We ship coarse CEFR buckets so a simple enum ordering is enough.
    if (query.minEnglishLevel) {
      const order: EnglishLevel[] = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT'];
      const idx = order.indexOf(query.minEnglishLevel);
      if (idx >= 0) {
        where.OR = [
          ...(((where.OR as unknown[] | undefined) ?? []) as unknown[]),
          { minEnglishLevel: null },
          { minEnglishLevel: { in: order.slice(0, idx + 1) } },
        ];
      }
    }

    const result = await paginate(this.prisma.job, {
      page: query.page,
      pageSize: query.limit ? Math.min(query.limit, 100) : undefined,
      where,
      orderBy: { createdAt: 'desc' },
    });

    const items = (result as { items: Array<{ id: string }> }).items;
    const enrichedItems = await this.enrichWithBookmarked(items, viewerId);
    return { ...result, items: enrichedItems };
  }

  /**
   * Fit score for a specific job against the viewer's primary resume.
   * Builds a condensed job description from the stored fields (title +
   * requirements + skills + description) and reuses the existing keyword
   * match engine so we don't duplicate scoring logic.
   */
  async getFit(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new EntityNotFoundException('Job', jobId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });

    if (!user?.primaryResumeId) {
      throw new ConflictException('NO_PRIMARY_RESUME');
    }

    // Consolidated text the matcher can scan. Requirements/skills first so
    // they outweigh the marketing copy in the description if a future tweak
    // starts weighting position.
    const jobText = [
      job.title,
      (job.requirements ?? []).join('\n'),
      (job.skills ?? []).join(', '),
      job.description,
    ]
      .filter(Boolean)
      .join('\n\n');

    const match = await this.resumeAnalytics.matchJobDescription(
      user.primaryResumeId,
      userId,
      jobText,
    );

    // Derive a very lightweight dimensional breakdown directly from the
    // structured fields we already have. The keyword engine gives us the
    // overall score; this splits it by skill kind so the UI can show bars.
    const hardSkillsPct = percentOverlap(job.skills ?? [], match.matchedKeywords);
    const softSkillsPct = percentOverlap(
      extractSoftSignals(job.description),
      match.matchedKeywords,
    );

    return {
      ...match,
      dimensions: {
        hardSkills: hardSkillsPct,
        softSkills: softSkillsPct,
      },
    };
  }

  async findById(id: string, viewerId?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            photoURL: true,
          },
        },
      },
    });

    if (!job) {
      throw new EntityNotFoundException('Job', id);
    }

    const [enriched] = await this.enrichWithBookmarked([job], viewerId);
    return enriched;
  }

  async apply(jobId: string, userId: string, dto: { coverLetter?: string; resumeId?: string }) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new EntityNotFoundException('Job', jobId);

    if (job.authorId === userId) {
      throw new ForbiddenException('You cannot apply to your own job');
    }

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (existing) {
      return { ...existing, alreadyApplied: true };
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        coverLetter: dto.coverLetter?.trim() || null,
        resumeId: dto.resumeId || null,
      },
    });
    // Kick off the timeline — the tracker uses this SUBMITTED event as the
    // anchor for silence detection and company response percentiles.
    await this.tracker.ensureSubmittedEvent(application.id, application.createdAt);
    return { ...application, alreadyApplied: false };
  }

  async withdrawApplication(jobId: string, userId: string) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (!app) throw new EntityNotFoundException('JobApplication', `${jobId}:${userId}`);
    await this.prisma.jobApplication.update({
      where: { id: app.id },
      data: { status: 'WITHDRAWN' },
    });
    return { jobId, userId, withdrawn: true };
  }

  async getRecommendedJobs(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 50);
    const safePage = Math.max(1, page);

    const userSkills = await this.collectUserSkills(userId);
    if (userSkills.length === 0) {
      return { data: [], total: 0, page: safePage, limit: safeLimit, totalPages: 0 };
    }

    // Fetch a generous pool, score them, then page client-side.
    const candidates = await this.prisma.job.findMany({
      where: {
        isActive: true,
        authorId: { not: userId },
        skills: { hasSome: userSkills },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const userSet = new Set(userSkills.map((s) => s.toLowerCase()));
    const scored = candidates
      .map((job) => {
        const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase());
        const intersect = jobSkills.filter((s) => userSet.has(s));
        const denominator = Math.max(jobSkills.length, 1);
        const matchScore = Math.round((intersect.length / denominator) * 100);
        return { job, matchScore, intersectCount: intersect.length };
      })
      .filter((entry) => entry.intersectCount > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    const total = scored.length;
    const totalPages = Math.ceil(total / safeLimit);
    const slice = scored.slice((safePage - 1) * safeLimit, safePage * safeLimit);

    const enriched = await this.enrichWithBookmarked(
      slice.map((e) => e.job),
      userId,
    );

    return {
      data: enriched.map((job, i) => ({ ...job, matchScore: slice[i].matchScore })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  /**
   * Collect skill names from the user's resumes — both `primaryStack`
   * (top-level array on the resume) and items inside SKILL-like sections.
   */
  private async collectUserSkills(userId: string): Promise<string[]> {
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

  async getMyApplications(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const [applications, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where: { userId, status: { not: 'WITHDRAWN' } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          job: {
            include: {
              author: {
                select: { id: true, name: true, username: true, photoURL: true },
              },
            },
          },
        },
      }),
      this.prisma.jobApplication.count({
        where: { userId, status: { not: 'WITHDRAWN' } },
      }),
    ]);

    return {
      data: applications,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private async enrichWithBookmarked<T extends { id: string }>(
    items: T[],
    viewerId: string | undefined,
  ): Promise<Array<T & { isBookmarked: boolean; hasApplied: boolean }>> {
    if (!viewerId || items.length === 0) {
      return items.map((item) => ({ ...item, isBookmarked: false, hasApplied: false }));
    }
    const ids = items.map((i) => i.id);
    const [bookmarks, applications] = await Promise.all([
      this.prisma.jobBookmark.findMany({
        where: { userId: viewerId, jobId: { in: ids } },
        select: { jobId: true },
      }),
      this.prisma.jobApplication.findMany({
        where: { userId: viewerId, jobId: { in: ids }, status: { not: 'WITHDRAWN' } },
        select: { jobId: true },
      }),
    ]);
    const bookmarkedIds = new Set(bookmarks.map((b) => b.jobId));
    const appliedIds = new Set(applications.map((a) => a.jobId));
    return items.map((item) => ({
      ...item,
      isBookmarked: bookmarkedIds.has(item.id),
      hasApplied: appliedIds.has(item.id),
    }));
  }

  async update(
    id: string,
    userId: string,
    dto: {
      title?: string;
      company?: string;
      location?: string;
      jobType?: JobType;
      description?: string;
      requirements?: string[];
      skills?: string[];
      salaryRange?: string;
      applyUrl?: string;
      isActive?: boolean;
      expiresAt?: Date;
      paymentCurrency?: PaymentCurrency | null;
      remotePolicy?: RemotePolicy | null;
      minEnglishLevel?: EnglishLevel | null;
    },
  ) {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new EntityNotFoundException('Job', id);
    }

    if (job.authorId !== userId) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    return this.prisma.job.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new EntityNotFoundException('Job', id);
    }

    if (job.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own jobs');
    }

    return this.prisma.job.delete({ where: { id } });
  }

  async getMyJobs(userId: string, page = 1, limit = 20) {
    return paginate(this.prisma.job, {
      page,
      pageSize: Math.min(limit, 100),
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async bookmark(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new EntityNotFoundException('Job', jobId);

    const existing = await this.prisma.jobBookmark.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (existing) {
      return { jobId, userId, alreadyBookmarked: true };
    }

    await this.prisma.jobBookmark.create({ data: { jobId, userId } });
    return { jobId, userId, alreadyBookmarked: false };
  }

  async unbookmark(jobId: string, userId: string) {
    await this.prisma.jobBookmark.deleteMany({ where: { jobId, userId } });
    return { jobId, userId, removed: true };
  }

  async getBookmarkedJobs(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const [bookmarks, total] = await Promise.all([
      this.prisma.jobBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          job: {
            include: {
              author: {
                select: { id: true, name: true, username: true, photoURL: true },
              },
            },
          },
        },
      }),
      this.prisma.jobBookmark.count({ where: { userId } }),
    ]);

    return {
      data: bookmarks.map((b) => ({ ...b.job, bookmarkedAt: b.createdAt })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
