import { Inject, Injectable } from '@nestjs/common';
import type { CreateResume, UpdateResume } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { RESUME_EVENT_PUBLISHER, type ResumeEventPublisher } from '../domain/ports';
import { ResumeVersionServicePort } from './ports/resume-version-service.port';
import { ResumesRepositoryPort } from './ports/resumes-repository.port';
import { ResumesServicePort, type UserResumesPaginatedResult } from './ports/resumes-service.port';

const MAX_RESUMES_PER_USER = 4;

/**
 * Sanitize HTML content to prevent XSS attacks
 * Strips all HTML tags and scripts
 * Returns undefined if input is not a string
 */
function sanitizeContent(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  if (typeof text !== 'string') return undefined;
  return text.replace(/<[^>]*>/g, '');
}

@Injectable()
export class ResumesService extends ResumesServicePort {
  constructor(
    private readonly repository: ResumesRepositoryPort,
    private readonly versionService: ResumeVersionServicePort,
    @Inject(RESUME_EVENT_PUBLISHER)
    private readonly eventPublisher: ResumeEventPublisher,
  ) {
    super();
  }

  async findAllUserResumes(userId: string, page?: number, limit?: number) {
    if (page !== undefined && limit !== undefined) {
      // Validate pagination parameters
      if (page < 1) page = 1; // Minimum page is 1
      if (limit < 1) limit = 1; // Minimum limit is 1
      if (limit > 100) limit = 100; // Cap at 100 items per page

      return this.findPaginated(userId, page, limit);
    }
    const resumes = await this.repository.findAllUserResumes(userId);
    return resumes;
  }

  async findResumeByIdForUser(id: string, userId: string) {
    const resume = await this.repository.findResumeByIdAndUserId(id, userId);
    if (!resume) throw new EntityNotFoundException('Resume', id);
    return resume;
  }

  async createResumeForUser(userId: string, data: CreateResume) {
    await this.ensureUserHasSlots(userId);

    // Sanitize input to prevent XSS attacks
    const sanitizedTitle = sanitizeContent(data.title);
    const sanitizedSummary = sanitizeContent(data.summary);

    // If sanitization removed the title (e.g., was an array/object), use empty string or reject
    const sanitizedData = {
      ...data,
      title: sanitizedTitle ?? '',
      summary: sanitizedSummary,
    };

    const resume = await this.repository.createResumeForUser(userId, sanitizedData);

    this.eventPublisher.publishResumeCreated(resume.id, {
      userId,
      title: resume.title ?? '',
    });

    return resume;
  }

  async updateResumeForUser(id: string, userId: string, data: UpdateResume) {
    await this.createSnapshotSafely(id);

    // Sanitize input to prevent XSS attacks
    const sanitizedData = {
      ...data,
      title: sanitizeContent(data.title),
      summary: sanitizeContent(data.summary),
    };

    const resume = await this.repository.updateResumeForUser(id, userId, sanitizedData);
    if (!resume) throw new EntityNotFoundException('Resume', id);

    this.eventPublisher.publishResumeUpdated(id, {
      userId,
      changedFields: Object.keys(data),
    });

    return resume;
  }

  async deleteResumeForUser(id: string, userId: string) {
    const deleted = await this.repository.deleteResumeForUser(id, userId);
    if (!deleted) throw new EntityNotFoundException('Resume', id);

    this.eventPublisher.publishResumeDeleted(id, { userId });

    return;
  }

  async findResumeByUserId(userId: string) {
    return this.repository.findResumeByUserId(userId);
  }

  async getRemainingSlots(userId: string) {
    const existing = await this.repository.findAllUserResumes(userId);
    return {
      used: existing.length,
      limit: MAX_RESUMES_PER_USER,
      remaining: MAX_RESUMES_PER_USER - existing.length,
    };
  }

  private async findPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserResumesPaginatedResult> {
    const skip = (page - 1) * limit;
    const [resumes, total] = await Promise.all([
      this.repository.findAllUserResumesPaginated(userId, skip, limit),
      this.repository.countUserResumes(userId),
    ]);
    const totalPages = Math.ceil(total / limit);

    return {
      resumes,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  private async ensureUserHasSlots(userId: string): Promise<void> {
    const existing = await this.repository.findAllUserResumes(userId);
    if (existing.length >= MAX_RESUMES_PER_USER) {
      const { UnprocessableEntityException } = await import('@nestjs/common');
      throw new UnprocessableEntityException(
        `Resume limit reached. Maximum ${MAX_RESUMES_PER_USER} resumes allowed.`,
      );
    }
  }

  private async createSnapshotSafely(resumeId: string): Promise<void> {
    try {
      await this.versionService.createSnapshot(resumeId);
    } catch {
      // Snapshot failure should not block update
    }
  }
}
