import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EducationRepository } from '../repositories/education.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateEducationDto, UpdateEducationDto } from '../dto/education.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Education } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class EducationService {
  private readonly logger = new Logger(EducationService.name);

  constructor(
    private readonly educationRepository: EducationRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Education>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.educationRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Education> {
    await this.validateResumeOwnership(resumeId, userId);

    const education = await this.educationRepository.findOne(id, resumeId);
    if (!education) {
      throw new NotFoundException('Education not found');
    }

    return education;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateEducationDto,
  ): Promise<Education> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating education for resume: ${resumeId}`);
    return this.educationRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateEducationDto,
  ): Promise<Education> {
    await this.validateResumeOwnership(resumeId, userId);

    const education = await this.educationRepository.update(id, resumeId, data);
    if (!education) {
      throw new NotFoundException('Education not found');
    }

    this.logger.log(`Updated education: ${id}`);
    return education;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.educationRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Education not found');
    }

    this.logger.log(`Deleted education: ${id}`);
    return ApiResponseHelper.message('Education deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.educationRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Education entries reordered successfully');
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
