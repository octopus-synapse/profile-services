import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ResumesRepository } from './resumes.repository';
import type { CreateResume, UpdateResume } from '@/shared-kernel';
import { ApiResponseHelper } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ResumeVersionService } from '@/bounded-contexts/resumes/resume-versions/services/resume-version.service';
import {
  RESUME_EVENT_PUBLISHER,
  type ResumeEventPublisher,
} from '../domain/ports';
import sanitizeHtml from 'sanitize-html';

const MAX_RESUMES_PER_USER = 4;

/**
 * Sanitize HTML content to prevent XSS attacks
 * Strips all HTML tags and scripts
 * Returns undefined if input is not a string
 */
function sanitizeContent(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  if (typeof text !== 'string') return undefined; // Reject non-strings
  return sanitizeHtml(text, {
    allowedTags: [], // No HTML allowed
    allowedAttributes: {},
  });
}

@Injectable()
export class ResumesService {
  constructor(
    private readonly repository: ResumesRepository,
    private readonly versionService: ResumeVersionService,
    @Inject(RESUME_EVENT_PUBLISHER)
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async findAllUserResumes(userId: string, page?: number, limit?: number) {
    if (page !== undefined && limit !== undefined) {
      // Validate pagination parameters
      if (page < 1) page = 1; // Minimum page is 1
      if (limit < 1) limit = 1; // Minimum limit is 1
      if (limit > 100) limit = 100; // Cap at 100 items per page

      return this.findPaginated(userId, page, limit);
    }
    const resumes = await this.repository.findAllUserResumes(userId);
    return ApiResponseHelper.success(resumes);
  }

  async findResumeByIdForUser(id: string, userId: string) {
    const resume = await this.repository.findResumeByIdAndUserId(id, userId);
    if (!resume) throw new NotFoundException('Resume not found');
    return ApiResponseHelper.success(resume);
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

    const resume = await this.repository.createResumeForUser(
      userId,
      sanitizedData,
    );

    this.eventPublisher.publishResumeCreated(resume.id, {
      userId,
      title: resume.title ?? '',
    });

    return ApiResponseHelper.success(resume);
  }

  async updateResumeForUser(id: string, userId: string, data: UpdateResume) {
    await this.createSnapshotSafely(id);

    // Sanitize input to prevent XSS attacks
    const sanitizedData = {
      ...data,
      title: sanitizeContent(data.title),
      summary: sanitizeContent(data.summary),
    };

    const resume = await this.repository.updateResumeForUser(
      id,
      userId,
      sanitizedData,
    );
    if (!resume) throw new NotFoundException('Resume not found');

    this.eventPublisher.publishResumeUpdated(id, {
      userId,
      changedFields: Object.keys(data),
    });

    return ApiResponseHelper.success(resume);
  }

  async deleteResumeForUser(id: string, userId: string) {
    const deleted = await this.repository.deleteResumeForUser(id, userId);
    if (!deleted) throw new NotFoundException('Resume not found');

    this.eventPublisher.publishResumeDeleted(id, { userId });

    return ApiResponseHelper.message('Resume deleted successfully');
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

  private async findPaginated(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [resumes, total] = await Promise.all([
      this.repository.findAllUserResumesPaginated(userId, skip, limit),
      this.repository.countUserResumes(userId),
    ]);
    const totalPages = Math.ceil(total / limit);
    return ApiResponseHelper.paginated(resumes, {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
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
