import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OpenSourceRepository } from '../repositories/open-source.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateOpenSourceDto,
  UpdateOpenSourceDto,
} from '../dto/open-source.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { OpenSourceContribution } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
  ApiResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class OpenSourceService {
  private readonly logger = new Logger(OpenSourceService.name);

  constructor(
    private readonly openSourceRepository: OpenSourceRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<OpenSourceContribution>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.openSourceRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<OpenSourceContribution> {
    await this.validateResumeOwnership(resumeId, userId);

    const contribution = await this.openSourceRepository.findOne(id, resumeId);
    if (!contribution) {
      throw new NotFoundException('Open source contribution not found');
    }

    return contribution;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateOpenSourceDto,
  ): Promise<OpenSourceContribution> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(
      `Creating open source contribution for resume: ${resumeId}`,
    );
    return this.openSourceRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateOpenSourceDto,
  ): Promise<OpenSourceContribution> {
    await this.validateResumeOwnership(resumeId, userId);

    const contribution = await this.openSourceRepository.update(
      id,
      resumeId,
      data,
    );
    if (!contribution) {
      throw new NotFoundException('Open source contribution not found');
    }

    this.logger.log(`Updated open source contribution: ${id}`);
    return contribution;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.openSourceRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Open source contribution not found');
    }

    this.logger.log(`Deleted open source contribution: ${id}`);
    return ApiResponseHelper.message(
      'Open source contribution deleted successfully',
    );
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.openSourceRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message(
      'Open source contributions reordered successfully',
    );
  }

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
