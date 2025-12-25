import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SkillRepository } from '../repositories/skill.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateSkillDto,
  UpdateSkillDto,
  BulkCreateSkillsDto,
} from '../dto/skill.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Skill } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
  ApiResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
    category?: string,
  ): Promise<PaginatedResult<Skill>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.skillRepository.findAll(resumeId, page, limit, category);
  }

  async findOne(resumeId: string, id: string, userId: string): Promise<Skill> {
    await this.validateResumeOwnership(resumeId, userId);

    const skill = await this.skillRepository.findOne(id, resumeId);
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateSkillDto,
  ): Promise<Skill> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating skill for resume: ${resumeId}`);
    return this.skillRepository.create(resumeId, data);
  }

  async createMany(
    resumeId: string,
    userId: string,
    data: BulkCreateSkillsDto,
  ): Promise<ApiResponse<{ count: number }>> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(
      `Creating ${data.skills.length} skills for resume: ${resumeId}`,
    );
    const count = await this.skillRepository.createMany(resumeId, data.skills);
    return ApiResponseHelper.count(count, 'Skills created successfully');
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateSkillDto,
  ): Promise<Skill> {
    await this.validateResumeOwnership(resumeId, userId);

    const skill = await this.skillRepository.update(id, resumeId, data);
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    this.logger.log(`Updated skill: ${id}`);
    return skill;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.skillRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Skill not found');
    }

    this.logger.log(`Deleted skill: ${id}`);
    return ApiResponseHelper.message('Skill deleted successfully');
  }

  async removeByCategory(
    resumeId: string,
    userId: string,
    category: string,
  ): Promise<ApiResponse<{ count: number }>> {
    await this.validateResumeOwnership(resumeId, userId);

    const count = await this.skillRepository.deleteByCategory(
      resumeId,
      category,
    );
    this.logger.log(`Deleted ${count} skills in category: ${category}`);
    return ApiResponseHelper.count(count, 'Skills deleted successfully');
  }

  async getCategories(resumeId: string, userId: string): Promise<string[]> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.skillRepository.getCategories(resumeId);
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.skillRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Skills reordered successfully');
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
