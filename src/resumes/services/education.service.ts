/**
 * Education Service
 *
 * BUG-019 FIX: Added date validation consistent with ExperienceService
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Education } from '@prisma/client';
import { EducationRepository } from '../repositories/education.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateEducation,
  UpdateEducation,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';
import {
  ApiResponseHelper,
  MessageResponse,
  DataResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class EducationService extends BaseSubResourceService<
  Education,
  CreateEducation,
  UpdateEducation
> {
  protected readonly entityName = 'Education';
  protected readonly logger = new Logger(EducationService.name);

  constructor(
    educationRepository: EducationRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(educationRepository, resumesRepository);
  }

  /**
   * BUG-019 FIX: Override to add education-specific date validation
   */
  override async addToResume(
    resumeId: string,
    userId: string,
    entityData: CreateEducation,
  ): Promise<DataResponse<Education>> {
    this.validateEducationDates(entityData);
    return super.addToResume(resumeId, userId, entityData);
  }

  /**
   * BUG-019 FIX: Override to add date validation on update
   */
  override async updateById(
    resumeId: string,
    entityId: string,
    userId: string,
    updateData: UpdateEducation,
  ): Promise<DataResponse<Education>> {
    if (
      updateData.current !== undefined ||
      updateData.endDate !== undefined ||
      updateData.startDate !== undefined
    ) {
      this.validateEducationDates(updateData);
    }
    return super.updateById(resumeId, entityId, userId, updateData);
  }

  /**
   * Override reorder to use "Education entries" instead of "Educations"
   */
  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    await this.repository.reorder(resumeId, ids);
    return ApiResponseHelper.message(
      'Education entries reordered successfully',
    );
  }

  /**
   * BUG-019 FIX: Validate education dates
   * Consistent with ExperienceService validation
   *
   * Rules:
   * - If current=true → endDate MUST be null/undefined
   * - endDate cannot be before startDate
   */
  private validateEducationDates(
    data: CreateEducation | UpdateEducation,
  ): void {
    // current=true with endDate is invalid
    if (data.current === true && data.endDate) {
      throw new BadRequestException(
        'Current education cannot have an end date. Either set current to false or remove endDate.',
      );
    }

    // Date range validation
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      if (end < start) {
        throw new BadRequestException('End date cannot be before start date.');
      }
    }
  }
}
