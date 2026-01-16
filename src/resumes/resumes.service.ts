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
  async findAllUserResumes(userId: string, page?: number, limit?: number) {
    this.logger.log(`Finding all resumes for user: ${userId}`);

    // If pagination is requested, use proper DB pagination
    if (page !== undefined && limit !== undefined) {
      const skipCount = (page - 1) * limit;
      const [paginatedResumes, totalResumeCount] = await Promise.all([
        this.resumesRepository.findAllUserResumesPaginated(
          userId,
          skipCount,
          limit,
        ),
        this.resumesRepository.countUserResumes(userId),
      ]);

      const totalPages = Math.ceil(totalResumeCount / limit);

      const paginationMetadata = {
        total: totalResumeCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return ApiResponseHelper.paginated(paginatedResumes, paginationMetadata);
    }

    // Otherwise return all (for cases where we need full list)
    const allUserResumes =
      await this.resumesRepository.findAllUserResumes(userId);
    return ApiResponseHelper.success(allUserResumes);
  }

  async findResumeByIdForUser(id: string, userId: string) {
    this.logger.log(`Finding resume: ${id} for user: ${userId}`);
    const foundResume = await this.resumesRepository.findResumeByIdAndUserId(
      id,
      userId,
    );

    if (!foundResume) {
      throw new NotFoundException('Resume not found');
    }

    return ApiResponseHelper.success(foundResume);
  }

  async createResumeForUser(userId: string, createResume: CreateResume) {
    this.logger.log(`Creating resume for user: ${userId}`);

    // Check resume limit - BUG-006 FIX: Use 422 instead of 400
    const existingUserResumes =
      await this.resumesRepository.findAllUserResumes(userId);
    if (existingUserResumes.length >= MAX_RESUMES_PER_USER) {
      throw new UnprocessableEntityException(
        `Resume limit reached. You can only create up to ${MAX_RESUMES_PER_USER} resumes. Please delete an existing resume to create a new one.`,
      );
    }

    const createdResume = await this.resumesRepository.createResumeForUser(
      userId,
      createResume,
    );
    return ApiResponseHelper.success(createdResume);
  }

  async updateResumeForUser(
    id: string,
    userId: string,
    updateResume: UpdateResume,
  ) {
    this.logger.log(`Updating resume: ${id} for user: ${userId}`);

    // Create snapshot before update
    try {
      await this.versionService.createSnapshot(id);
    } catch (snapshotError) {
      this.logger.error(
        `Failed to create version snapshot: ${(snapshotError as Error).message}`,
      );
    }

    const updatedResume = await this.resumesRepository.updateResumeForUser(
      id,
      userId,
      updateResume,
    );

    if (!updatedResume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    // Invalidate cache (fire-and-forget)
    this.cacheInvalidation
      .invalidateResume({
        resumeId: id,
        slug: updatedResume.slug ?? undefined,
        userId,
      })
      .catch((cacheError: Error) =>
        this.logger.error(`Failed to invalidate cache: ${cacheError.message}`),
      );

    return ApiResponseHelper.success(updatedResume);
  }

  async deleteResumeForUser(id: string, userId: string) {
    this.logger.log(`Removing resume: ${id} for user: ${userId}`);
    const wasResumeDeleted = await this.resumesRepository.deleteResumeForUser(
      id,
      userId,
    );

    if (!wasResumeDeleted) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    return ApiResponseHelper.message('Resume deleted successfully');
  }

  async findResumeByUserId(userId: string) {
    this.logger.log(`Finding resume by user ID: ${userId}`);
    return await this.resumesRepository.findResumeByUserId(userId);
  }

  /**
   * Get the number of remaining resume slots for a user
   */
  async getRemainingSlots(
    userId: string,
  ): Promise<{ used: number; limit: number; remaining: number }> {
    const existingUserResumes =
      await this.resumesRepository.findAllUserResumes(userId);
    const usedResumeCount = existingUserResumes.length;
    return {
      used: usedResumeCount,
      limit: MAX_RESUMES_PER_USER,
      remaining: MAX_RESUMES_PER_USER - usedResumeCount,
    };
  }
}
