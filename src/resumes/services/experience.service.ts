import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ExperienceRepository } from '../repositories/experience.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from '../dto/experience.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Experience } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class ExperienceService {
  private readonly logger = new Logger(ExperienceService.name);

  constructor(
    private readonly experienceRepository: ExperienceRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Experience>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.experienceRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Experience> {
    await this.validateResumeOwnership(resumeId, userId);

    const experience = await this.experienceRepository.findOne(id, resumeId);
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    return experience;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateExperienceDto,
  ): Promise<Experience> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating experience for resume: ${resumeId}`);
    return this.experienceRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateExperienceDto,
  ): Promise<Experience> {
    await this.validateResumeOwnership(resumeId, userId);

    const experience = await this.experienceRepository.update(
      id,
      resumeId,
      data,
    );
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    this.logger.log(`Updated experience: ${id}`);
    return experience;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.experienceRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Experience not found');
    }

    this.logger.log(`Deleted experience: ${id}`);
    return ApiResponseHelper.message('Experience deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.experienceRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Experiences reordered successfully');
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
