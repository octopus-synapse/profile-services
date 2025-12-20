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
  ): Promise<{ success: boolean; count: number }> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(
      `Creating ${data.skills.length} skills for resume: ${resumeId}`,
    );
    const count = await this.skillRepository.createMany(resumeId, data.skills);
    return { success: true, count };
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
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.skillRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Skill not found');
    }

    this.logger.log(`Deleted skill: ${id}`);
    return { success: true, message: 'Skill deleted successfully' };
  }

  async removeByCategory(
    resumeId: string,
    userId: string,
    category: string,
  ): Promise<{ success: boolean; count: number }> {
    await this.validateResumeOwnership(resumeId, userId);

    const count = await this.skillRepository.deleteByCategory(
      resumeId,
      category,
    );
    this.logger.log(`Deleted ${count} skills in category: ${category}`);
    return { success: true, count };
  }

  async getCategories(resumeId: string, userId: string): Promise<string[]> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.skillRepository.getCategories(resumeId);
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.skillRepository.reorder(resumeId, ids);
    return { success: true, message: 'Skills reordered successfully' };
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
