import { Injectable, Logger } from '@nestjs/common';
import { BugBounty } from '@prisma/client';
import {
  ApiResponse,
  ApiResponseHelper,
  MessageResponse,
} from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { CreateBugBounty, EventPublisher, UpdateBugBounty } from '@/shared-kernel';
import { BugBountyRepository } from '../repositories/bug-bounty.repository';
import { BaseSubResourceService } from './base';

@Injectable()
export class BugBountyService extends BaseSubResourceService<
  BugBounty,
  CreateBugBounty,
  UpdateBugBounty
> {
  protected readonly entityName = 'Bug bounty';
  protected readonly sectionType: SectionType = 'bugbounties';
  protected readonly logger = new Logger(BugBountyService.name);

  constructor(
    private readonly bugBountyRepository: BugBountyRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(bugBountyRepository, resumesRepository, eventPublisher);
  }

  /**
   * Override reorder to use "Bug bounties" instead of "Bug bountys"
   */
  async reorder(resumeId: string, userId: string, ids: string[]): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    await this.repository.reorderEntitiesForResume(resumeId, ids);
    return ApiResponseHelper.message('Bug bounties reordered successfully');
  }

  /**
   * Get total rewards across all bug bounties for a resume
   */
  async getTotalRewards(resumeId: string, userId: string): Promise<ApiResponse<{ total: number }>> {
    await this.validateResumeOwnership(resumeId, userId);
    const total = await this.bugBountyRepository.getTotalRewards(resumeId);
    return ApiResponseHelper.success({ total });
  }
}
