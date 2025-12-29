import { Injectable, Logger } from '@nestjs/common';
import { Skill } from '@prisma/client';
import { SkillRepository } from '../repositories/skill.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateSkillDto,
  UpdateSkillDto,
  BulkCreateSkillsDto,
} from '../dto/skill.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { ApiResponseHelper, ApiResponse } from '../../common/dto/api-response.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class SkillService extends BaseSubResourceService<
  Skill,
  CreateSkillDto,
  UpdateSkillDto
> {
  protected readonly entityName = 'Skill';
  protected readonly logger = new Logger(SkillService.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(skillRepository, resumesRepository);
  }

  /**
   * Override findAll to support category filter and higher default limit
   */
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

  /**
   * Bulk create multiple skills at once
   */
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

  /**
   * Remove all skills in a category
   */
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

  /**
   * Get all unique categories for a resume
   */
  async getCategories(resumeId: string, userId: string): Promise<string[]> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.skillRepository.getCategories(resumeId);
  }
}
