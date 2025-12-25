import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { BugBountyRepository } from '../repositories/bug-bounty.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateBugBountyDto, UpdateBugBountyDto } from '../dto/bug-bounty.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { BugBounty } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
  ApiResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class BugBountyService {
  private readonly logger = new Logger(BugBountyService.name);

  constructor(
    private readonly bugBountyRepository: BugBountyRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<BugBounty>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.bugBountyRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<BugBounty> {
    await this.validateResumeOwnership(resumeId, userId);

    const bugBounty = await this.bugBountyRepository.findOne(id, resumeId);
    if (!bugBounty) {
      throw new NotFoundException('Bug bounty not found');
    }

    return bugBounty;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateBugBountyDto,
  ): Promise<BugBounty> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating bug bounty for resume: ${resumeId}`);
    return this.bugBountyRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateBugBountyDto,
  ): Promise<BugBounty> {
    await this.validateResumeOwnership(resumeId, userId);

    const bugBounty = await this.bugBountyRepository.update(id, resumeId, data);
    if (!bugBounty) {
      throw new NotFoundException('Bug bounty not found');
    }

    this.logger.log(`Updated bug bounty: ${id}`);
    return bugBounty;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.bugBountyRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Bug bounty not found');
    }

    this.logger.log(`Deleted bug bounty: ${id}`);
    return ApiResponseHelper.message('Bug bounty deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.bugBountyRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Bug bounties reordered successfully');
  }

  async getTotalRewards(
    resumeId: string,
    userId: string,
  ): Promise<ApiResponse<{ total: number }>> {
    await this.validateResumeOwnership(resumeId, userId);
    const total = await this.bugBountyRepository.getTotalRewards(resumeId);
    return ApiResponseHelper.success({ total });
  }

  private async validateResumeOwnership(
    resumeId: string,
    userId: string,
  ): Promise<void> {
    const resume = await this.resumesRepository.findOne(resumeId, userId);
    if (!resume) {
      throw new ForbiddenException('Resume not found or access denied');
    }
  }
}
