import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AchievementRepository } from '../repositories/achievement.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateAchievementDto,
  UpdateAchievementDto,
} from '../dto/achievement.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Achievement } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    private readonly achievementRepository: AchievementRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Achievement>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.achievementRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Achievement> {
    await this.validateResumeOwnership(resumeId, userId);

    const achievement = await this.achievementRepository.findOne(id, resumeId);
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    return achievement;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateAchievementDto,
  ): Promise<Achievement> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating achievement for resume: ${resumeId}`);
    return this.achievementRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateAchievementDto,
  ): Promise<Achievement> {
    await this.validateResumeOwnership(resumeId, userId);

    const achievement = await this.achievementRepository.update(
      id,
      resumeId,
      data,
    );
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    this.logger.log(`Updated achievement: ${id}`);
    return achievement;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.achievementRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Achievement not found');
    }

    this.logger.log(`Deleted achievement: ${id}`);
    return ApiResponseHelper.message('Achievement deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.achievementRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Achievements reordered successfully');
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
