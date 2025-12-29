import { Injectable, Logger } from '@nestjs/common';
import { BugBounty } from '@prisma/client';
import { BugBountyRepository } from '../repositories/bug-bounty.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateBugBountyDto, UpdateBugBountyDto } from '../dto/bug-bounty.dto';
import {
  ApiResponseHelper,
  ApiResponse,
  MessageResponse,
} from '../../common/dto/api-response.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class BugBountyService extends BaseSubResourceService<
  BugBounty,
  CreateBugBountyDto,
  UpdateBugBountyDto
> {
  protected readonly entityName = 'Bug bounty';
  protected readonly logger = new Logger(BugBountyService.name);

  constructor(
    private readonly bugBountyRepository: BugBountyRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(bugBountyRepository, resumesRepository);
  }

  /**
   * Override reorder to use "Bug bounties" instead of "Bug bountys"
   */
  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    await this.repository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Bug bounties reordered successfully');
  }

  /**
   * Get total rewards across all bug bounties for a resume
   */
  async getTotalRewards(
    resumeId: string,
    userId: string,
  ): Promise<ApiResponse<{ total: number }>> {
    await this.validateResumeOwnership(resumeId, userId);
    const total = await this.bugBountyRepository.getTotalRewards(resumeId);
    return ApiResponseHelper.success({ total });
  }
}
