import { Injectable, Logger } from '@nestjs/common';
import type { Skill } from '@prisma/client';
import { SkillRepository } from '../repositories/skill.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import {
  CreateSkill,
  UpdateSkill,
  type BulkCreateSkills,
} from '@/shared-kernel';
import type { PaginatedResult } from '@/shared-kernel';
import {
  ApiResponseHelper,
  ApiResponse,
} from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

@Injectable()
export class SkillService extends BaseSubResourceService<
  Skill,
  CreateSkill,
  UpdateSkill
> {
  protected readonly entityName = 'Skill';
  protected readonly sectionType: SectionType = 'skills';
  protected readonly logger = new Logger(SkillService.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(skillRepository, resumesRepository, eventPublisher);
  }

  /**
   * Override findAll to support category filter and higher default limit
   */
  async findAllSkillsForResume(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
    category?: string,
  ): Promise<PaginatedResult<Skill>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.skillRepository.findAllSkillsForResume(
      resumeId,
      page,
      limit,
      category,
    );
  }

  /**
   * Bulk create multiple skills at once
   */
  async createMany(
    resumeId: string,
    userId: string,
    data: BulkCreateSkills,
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
