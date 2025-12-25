import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AwardRepository } from '../repositories/award.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateAwardDto, UpdateAwardDto } from '../dto/award.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Award } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class AwardService {
  private readonly logger = new Logger(AwardService.name);

  constructor(
    private readonly awardRepository: AwardRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Award>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.awardRepository.findAll(resumeId, page, limit);
  }

  async findOne(resumeId: string, id: string, userId: string): Promise<Award> {
    await this.validateResumeOwnership(resumeId, userId);

    const award = await this.awardRepository.findOne(id, resumeId);
    if (!award) {
      throw new NotFoundException('Award not found');
    }

    return award;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateAwardDto,
  ): Promise<Award> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating award for resume: ${resumeId}`);
    return this.awardRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateAwardDto,
  ): Promise<Award> {
    await this.validateResumeOwnership(resumeId, userId);

    const award = await this.awardRepository.update(id, resumeId, data);
    if (!award) {
      throw new NotFoundException('Award not found');
    }

    this.logger.log(`Updated award: ${id}`);
    return award;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.awardRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Award not found');
    }

    this.logger.log(`Deleted award: ${id}`);
    return ApiResponseHelper.message('Award deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.awardRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Awards reordered successfully');
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
