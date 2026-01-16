import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Experience } from '@prisma/client';
import { ExperienceRepository } from '../repositories/experience.repository';
import { ResumesRepository } from '../resumes.repository';
import type {
  CreateExperience,
  UpdateExperience,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';
import { DataResponse } from '../../common/dto/api-response.dto';

@Injectable()
export class ExperienceService extends BaseSubResourceService<
  Experience,
  CreateExperience,
  UpdateExperience
> {
  protected readonly entityName = 'Experience';
  protected readonly logger = new Logger(ExperienceService.name);

  constructor(
    experienceRepository: ExperienceRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(experienceRepository, resumesRepository);
  }

  /**
   * Override to add experience-specific validation
   * BUG-007: isCurrent/endDate validation
   * BUG-009: Date range validation
   */
  override async addEntityToResume(
    resumeId: string,
    userId: string,
    entityData: CreateExperience,
  ): Promise<DataResponse<Experience>> {
    this.validateExperienceDates(entityData);
    return super.addEntityToResume(resumeId, userId, entityData);
  }

  /**
   * Override to add experience-specific validation on update
   */
  override async updateEntityByIdForResume(
    resumeId: string,
    entityId: string,
    userId: string,
    updateData: UpdateExperience,
  ): Promise<DataResponse<Experience>> {
    // Only validate if date-related fields are being updated
    if (
      updateData.current !== undefined ||
      updateData.endDate !== undefined ||
      updateData.startDate !== undefined
    ) {
      this.validateExperienceDates(updateData);
    }
    return super.updateEntityByIdForResume(
      resumeId,
      entityId,
      userId,
      updateData,
    );
  }

  /**
   * BUG-007 FIX: Validate current and endDate relationship.
   * BUG-009 FIX: Validate date ranges.
   *
   * Rules:
   * - If current=true → endDate MUST be null/undefined
   * - If current=false → endDate SHOULD be set (warning only for now)
   * - endDate cannot be before startDate
   */
  private validateExperienceDates(
    data: CreateExperience | UpdateExperience,
  ): void {
    // BUG-007: current=true with endDate is invalid
    if (data.current === true && data.endDate) {
      throw new BadRequestException(
        'Current position cannot have an end date. Either set current to false or remove endDate.',
      );
    }

    // BUG-009: Date range validation
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      if (end < start) {
        throw new BadRequestException('End date cannot be before start date.');
      }

      if (end.getTime() === start.getTime()) {
        throw new BadRequestException(
          'End date cannot be the same as start date.',
        );
      }
    }
  }
}
