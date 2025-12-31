import { Injectable, Logger } from '@nestjs/common';
import { Education } from '@prisma/client';
import { EducationRepository } from '../repositories/education.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateEducationDto, UpdateEducationDto } from '../dto/education.dto';
import { BaseSubResourceService } from './base';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class EducationService extends BaseSubResourceService<
  Education,
  CreateEducationDto,
  UpdateEducationDto
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
}
