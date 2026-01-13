import {
  Injectable,
  NotFoundException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ResumesRepository } from './resumes.repository';
import type {
  CreateResume,
  UpdateResume,
} from '@octopus-synapse/profile-contracts';
import { ApiResponseHelper } from '../common/dto/api-response.dto';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import { ResumeVersionService } from '../resume-versions/services/resume-version.service';
import { CacheInvalidationService } from '../common/cache/services/cache-invalidation.service';

/** Maximum number of resumes a user can create */
const MAX_RESUMES_PER_USER = 4;

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly resumesRepository: ResumesRepository,
    private readonly versionService: ResumeVersionService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  /**
   * BUG-015 FIX: Use proper database pagination instead of fetching all and slicing
   */
  async findAll(userId: string, page?: number, limit?: number) {
    this.logger.log(`Finding all resumes for user: ${userId}`);

    // If pagination is requested, use proper DB pagination
    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [resumes, total] = await Promise.all([
        this.resumesRepository.findAllPaginated(userId, skip, limit),
        this.resumesRepository.count(userId),
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

    // Otherwise return all (for cases where we need full list)
    const resumes = await this.resumesRepository.findAll(userId);
    return ApiResponseHelper.success(resumes);
  }

  async findOne(id: string, userId: string) {
    this.logger.log(`Finding resume: ${id} for user: ${userId}`);
    const resume = await this.resumesRepository.findOne(id, userId);

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return ApiResponseHelper.success(resume);
  }

  async create(userId: string, createResume: CreateResume) {
    this.logger.log(`Creating resume for user: ${userId}`);

    // Check resume limit - BUG-006 FIX: Use 422 instead of 400
    const existingResumes = await this.resumesRepository.findAll(userId);
    if (existingResumes.length >= MAX_RESUMES_PER_USER) {
      throw new UnprocessableEntityException(
        `Resume limit reached. You can only create up to ${MAX_RESUMES_PER_USER} resumes. Please delete an existing resume to create a new one.`,
      );
    }

    const resume = await this.resumesRepository.create(userId, createResume);
    return ApiResponseHelper.success(resume);
  }

  async update(id: string, userId: string, updateResume: UpdateResume) {
    this.logger.log(`Updating resume: ${id} for user: ${userId}`);

    // Create snapshot before update
    try {
      await this.versionService.createSnapshot(id);
    } catch (err) {
      this.logger.error(
        `Failed to create version snapshot: ${(err as Error).message}`,
      );
    }

    const resume = await this.resumesRepository.update(
      id,
      userId,
      updateResume,
    );

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    // Invalidate cache (fire-and-forget)
    this.cacheInvalidation
      .invalidateResume({
        resumeId: id,
        slug: resume.slug ?? undefined,
        userId,
      })
      .catch((err: Error) =>
        this.logger.error(`Failed to invalidate cache: ${err.message}`),
      );

    return ApiResponseHelper.success(resume);
  }

  async remove(id: string, userId: string) {
    this.logger.log(`Removing resume: ${id} for user: ${userId}`);
    const deleted = await this.resumesRepository.delete(id, userId);

    if (!deleted) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    return ApiResponseHelper.message('Resume deleted successfully');
  }

  async findByUserId(userId: string) {
    this.logger.log(`Finding resume by user ID: ${userId}`);
    return await this.resumesRepository.findByUserId(userId);
  }

  /**
   * Get the number of remaining resume slots for a user
   */
  async getRemainingSlots(
    userId: string,
  ): Promise<{ used: number; limit: number; remaining: number }> {
    const existingResumes = await this.resumesRepository.findAll(userId);
    const used = existingResumes.length;
    return {
      used,
      limit: MAX_RESUMES_PER_USER,
      remaining: MAX_RESUMES_PER_USER - used,
    };
  }
}
