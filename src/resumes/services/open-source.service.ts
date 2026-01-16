import { Injectable, Logger } from '@nestjs/common';
import { OpenSourceContribution } from '@prisma/client';
import { OpenSourceRepository } from '../repositories/open-source.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateOpenSource,
  UpdateOpenSource,
} from '@octopus-synapse/profile-contracts';
import {
  ApiResponseHelper,
  ApiResponse,
  MessageResponse,
} from '../../common/dto/api-response.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class OpenSourceService extends BaseSubResourceService<
  OpenSourceContribution,
  CreateOpenSource,
  UpdateOpenSource
> {
  protected readonly entityName = 'Open source contribution';
  protected readonly logger = new Logger(OpenSourceService.name);

  constructor(
    private readonly openSourceRepository: OpenSourceRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(openSourceRepository, resumesRepository);
  }

  /**
   * Override reorder to use proper plural form
   */
  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    await this.repository.reorderEntitiesForResume(resumeId, ids);
    return ApiResponseHelper.message(
      'Open source contributions reordered successfully',
    );
  }

  /**
   * Get aggregated stats across all open source contributions
   */
  async getTotalStats(
    resumeId: string,
    userId: string,
  ): Promise<
    ApiResponse<{ totalCommits: number; totalPRs: number; totalStars: number }>
  > {
    await this.validateResumeOwnership(resumeId, userId);
    const stats = await this.openSourceRepository.getTotalStats(resumeId);
    return ApiResponseHelper.success(stats);
  }
}
