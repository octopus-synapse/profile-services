import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateRecommendationDto,
  UpdateRecommendationDto,
} from '../dto/recommendation.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Recommendation } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly recommendationRepository: RecommendationRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Recommendation>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.recommendationRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Recommendation> {
    await this.validateResumeOwnership(resumeId, userId);

    const recommendation = await this.recommendationRepository.findOne(
      id,
      resumeId,
    );
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    return recommendation;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateRecommendationDto,
  ): Promise<Recommendation> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating recommendation for resume: ${resumeId}`);
    return this.recommendationRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateRecommendationDto,
  ): Promise<Recommendation> {
    await this.validateResumeOwnership(resumeId, userId);

    const recommendation = await this.recommendationRepository.update(
      id,
      resumeId,
      data,
    );
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    this.logger.log(`Updated recommendation: ${id}`);
    return recommendation;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.recommendationRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Recommendation not found');
    }

    this.logger.log(`Deleted recommendation: ${id}`);
    return ApiResponseHelper.message('Recommendation deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.recommendationRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Recommendations reordered successfully');
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
